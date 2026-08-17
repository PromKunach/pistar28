# Tools Page Design Spec

**Date:** 2026-08-17  
**Status:** Approved  
**Routes:** `/tools`, `/tools/qr`, `/tools/bill-splitter`, `/tools/match-maker`

## Summary

Build an in-app **เครื่องมือ** hub with three client-side utilities for logged-in members: QR code generator, bill splitter, and match maker. Match maker uses the existing 32-member roster (nickname + profile photo), supports random pairing and flexible group splitting, and lets users blacklist members from the shuffle.

## Requirements

| Requirement | Detail |
|---|---|
| Auth | Logged-in members only; redirect to `/login?redirect={path}` |
| Navigation | Hub at `/tools` + sub-routes per tool |
| QR tool | Text/URL input → live preview → download PNG |
| Bill splitter | Equal split + optional tip % + round mode |
| Match maker | Random pairing + group split from member roster |
| Roster source | Supabase `profiles` table (same 32 members as `/member`) |
| Member display | `nickname_th` + profile picture (`pfp_*` storage URLs) |
| Blacklist | Exclude selected members before shuffle (session-only, not persisted to DB) |
| Group config | User chooses **members per group** OR **number of groups** |
| UI language | Thai labels and errors |
| Dark mode | Match existing app styling |

## Non-Goals (v1)

- Save bill/match history to Supabase
- Share results via URL
- Item-based bill splitting
- QR styling (colors, logo)
- Persist blacklist across sessions (optional localStorage nice-to-have, not required)

---

## Routes & Layout

| Route | Page |
|---|---|
| `/tools` | Hub grid of 3 tool cards |
| `/tools/qr` | QR generator |
| `/tools/bill-splitter` | Bill splitter |
| `/tools/match-maker` | Match maker |

**Shared layout:**
- Max width ~800px, centered
- Sub-pages: back link `← เครื่องมือทั้งหมด` → `/tools`
- Page title + short description

**Hub cards:**

| Slug | Thai title | Description |
|---|---|---|
| `qr` | สร้าง QR Code | แปลงข้อความหรือลิงก์เป็น QR |
| `bill-splitter` | แบ่งบิล | หารค่าใช้จ่ายเท่าๆ กัน |
| `match-maker` | จับคู่ / แบ่งกลุ่ม | สุ่มจากสมาชิก 32 คน |

**Sidebar update:** Replace external Cursor/Supabase links under **เครื่องมือ** with in-app tool links.

---

## Tool 1: QR Generator (`/tools/qr`)

| Control | Detail |
|---|---|
| Input | `<textarea>` for text or URL |
| Preview | Live QR image (updates on input) |
| Download | **ดาวน์โหลด PNG** button |
| Empty state | Hide QR until non-empty input |
| Min size | QR renders at 256×256 minimum |

Uses `qrcode` npm package (canvas/SVG → PNG download client-side). No server calls.

---

## Tool 2: Bill Splitter (`/tools/bill-splitter`)

| Field | Type | Default |
|---|---|---|
| ยอดรวม (บาท) | number input | empty |
| จำนวนคน | number input (min 1) | 2 |
| ทิป (%) | number input (0–100) | 0 |
| ปัดเศษ | select | ไม่ปัด |

**Round modes:**

| Value | Label | Behavior |
|---|---|---|
| `none` | ไม่ปัด | 2 decimal places |
| `up` | ปัดขึ้น | `Math.ceil` to whole baht |
| `down` | ปัดลง | `Math.floor` to whole baht |
| `nearest` | ปัดใกล้ที่สุด | `Math.round` to whole baht |

**Output:**
- ยอดรวมหลังทิป
- คนละ (บาท)

Validation: total > 0, people ≥ 1. Show inline Thai error if invalid.

---

## Tool 3: Match Maker (`/tools/match-maker`)

### Modes

| Mode | Thai label | Behavior |
|---|---|---|
| `pair` | จับคู่ | Shuffle eligible members → groups of 2; odd person → solo group of 1 |
| `group` | แบ่งกลุ่ม | Shuffle → split by group config |

### Group config (group mode only)

Toggle between two strategies:

| Strategy | Input | Result |
|---|---|---|
| `per_group` | จำนวนคนต่อกลุ่ม (2–16) | `ceil(eligible / size)` groups; last group may be smaller |
| `group_count` | จำนวนกลุ่ม (2–16) | Distribute members as evenly as possible across N groups |

### Member roster

- Fetch `id, nickname_th` ordered by `id` ascending (same order as `/member`)
- Avatar URL via `getPfpUrl(index)` from `userProfile.ts` pattern
- Display grid: avatar + nickname

### Blacklist

- Tap member to toggle **ไม่เข้าร่วม** (excluded from shuffle pool)
- Visual: dimmed card + strikethrough or badge `ยกเว้น`
- Blacklist applies before shuffle; minimum 2 eligible members required to run
- Show count: `เข้าร่วม X / 32 คน`

### Actions

| Button | Behavior |
|---|---|
| **สุ่ม** | Run shuffle + display results |
| **สุ่มใหม่** | Re-shuffle same pool (visible after first run) |

### Results display

- **Pair mode:** list of pairs, each row shows 2 avatars + nicknames (or 1 if solo)
- **Group mode:** numbered groups (กลุ่ม 1, กลุ่ม 2, …) with member chips (avatar + nickname)

---

## Architecture

**Approach A (approved):** All tools client-side. Match maker reads `profiles` via Supabase client (same as `/member`). Pure functions in `src/lib/` for bill math and shuffle logic (unit tested).

```
/tools (hub)
  ├── /tools/qr          → QrToolPage (client)
  ├── /tools/bill-splitter → BillSplitterPage (client)
  └── /tools/match-maker → MatchMakerPage (client, fetches roster)
```

**Shared modules:**

| File | Responsibility |
|---|---|
| `src/lib/memberRoster.ts` | `fetchMemberRoster()`, `MemberRosterEntry` type |
| `src/lib/billSplitter.ts` | `calculateBillSplit()` + tests |
| `src/lib/matchMaker.ts` | `shuffle`, `splitIntoPairs`, `splitIntoGroups` + tests |
| `src/components/tools/ToolPageHeader.tsx` | Back link + title |
| `src/components/tools/ToolHubCard.tsx` | Hub card link |
| `src/components/tools/RequireAuth.tsx` | Auth guard wrapper |

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Not logged in | Redirect to login |
| Roster fetch fails | `โหลดรายชื่อสมาชิกไม่สำเร็จ` + retry button |
| < 2 eligible members | Disable **สุ่ม**, show `ต้องมีสมาชิกอย่างน้อย 2 คน` |
| Invalid bill input | Inline validation, no result |
| Empty QR input | No preview, download disabled |

---

## Testing

- Unit: `billSplitter.test.ts`, `matchMaker.test.ts` (shuffle determinism with seeded RNG optional; test split logic with fixed order)
- Manual: auth guard, all 3 tools, blacklist, both group strategies, QR download
