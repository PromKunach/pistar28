# Profile Page Design Spec

**Date:** 2026-08-16  
**Status:** Approved  
**Route:** `/profile`

## Summary

Build a dedicated profile settings area for authenticated users. The page uses its own sidebar layout (separate from the main app shell). Users cannot edit identity fields (name, nickname, section, student ID). They can customize their member card appearance (colors, stickers) and manage privacy/account settings. Customizations persist in Supabase and render on `/member` for all users.

## Goals

- Provide a professional settings experience: card customization, privacy, account info
- Reuse the 3D `InspectCard` from the member page as the live preview
- Persist per-user customization in Supabase
- Reflect customizations on `/member` (card + avatar selector)

## Non-Goals (v1)

- Editing `full_name_th`, `nickname_th`, `section`, `pbri_id`
- Auto-save (explicit Save button only)
- User-uploaded stickers
- Sub-routes (`/profile/privacy`, etc.) — single page with panel switching
- Notification preferences, theme toggle

## Architecture

### Routing & Layout

| Item | Detail |
|---|---|
| Route group | `src/app/(profile)/` |
| Page | `src/app/(profile)/profile/page.tsx` |
| Layout | `src/app/(profile)/layout.tsx` — `ProfileSidebar` + main area, no main `Sidebar`/`Topbar` |
| App shell exclusion | Add `/profile` to `NO_LAYOUT_ROUTES` in `AppLayoutWrapper.tsx` |
| Auth | Redirect unauthenticated users to `/login?redirect=/profile` |
| Topbar link | Change Profile menu item from `/member` to `/profile` |

### Approach

**Approach A — Single page, sidebar switches panels** (approved)

Desktop: fixed `ProfileSidebar` (240px) + main area split into card preview (~45%) and active panel (~55%). On Privacy/Account panels, card preview compacts to top-left. Mobile: sidebar drawer, card stacked above panel.

## Sidebar Navigation

| Section | Thai label | Purpose |
|---|---|---|
| Customize | ปรับแต่งการ์ด | Card color, card stickers, selector stickers |
| Privacy | ความเป็นส่วนตัว | Email visibility, change password, session info |
| Account | บัญชี | Read-only profile summary, link to member page |
| Footer | กลับหน้าหลัก | Link to `/` |
| Footer | ออกจากระบบ | Sign out via Supabase auth |

Sidebar header: avatar + display name + `pbri_id` (read-only).

## Customize Panel

### Card Colors

Reuse announcements color-picker patterns (theme presets, spectrum, hex input, contrast warning).

| Field | DB column | Default |
|---|---|---|
| Card background | `card_color` | `#0f172a` |
| Text color | `card_text_color` | `#ffffff` |

Six theme pairs from announcements: คลาสสิก, เที่ยงคืน, อรุณ, มหาสมุทร, ป่า, บาน.

Contrast warning when ratio < 4.5:1 (same threshold as announcements).

### Card Stickers

- Library: static PNGs in `/public/stickers/` (20–30 assets)
- Placement: click card preview to place; drag to reposition; scale/rotate handles
- Limits: max 5 stickers per face (front and back separately)
- Face toggle: front / back editing mode
- Storage: normalized coordinates (0–1) relative to card bounds

```json
{
  "front": [
    { "id": "star-01", "x": 0.72, "y": 0.15, "scale": 0.8, "rotation": -12 }
  ],
  "back": []
}
```

### Selector Stickers

Decorate the circular avatar ring in `AvatarCarousel` / `MemberList` on `/member`.

- Max 3 stickers per user
- Fixed anchor slots: 12, 3, 6, 9 o'clock positions
- Mini avatar-ring preview in customize panel

```json
[
  { "id": "heart-01", "slot": "top" },
  { "id": "sparkle-02", "slot": "right" }
]
```

Slot values: `"top" | "right" | "bottom" | "left"`.

### Save Behavior

- **บันทึก** — writes to Supabase, shows toast "บันทึกแล้ว"
- **รีเซ็ต** — confirm dialog, restores defaults

## Privacy Panel

| Setting | Type | Default | Storage |
|---|---|---|---|
| แสดงอีเมล | Toggle | `false` | `privacy_settings.show_email` |
| เปลี่ยนรหัสผ่าน | Form | — | Supabase Auth `updateUser` |
| เซสชันปัจจุบัน | Read-only | — | Auth session metadata |

Password form: current password + new password + confirm. Errors in Thai.

Email visibility: when `show_email` is true, email appears on the user's own card back on `/profile` (and when self-viewing on `/member`). Other users' auth emails are not available client-side, so `/member` card backs for others always show `pbri_id` only.

## Account Panel

Read-only fields from `profiles` + auth:

- ชื่อ-นามสกุล (`full_name_th`)
- ชื่อเล่น (`nickname_th`)
- รหัสนักศึกษา (`pbri_id`)
- ฝ่าย (`section`)
- อีเมล (masked when `show_email` is false)

Extras:

- Link: "ดูการ์ดของฉันในหน้าสมาชิก" → `/member?member={profileId}`
- App version: `1.5.1`

## Database Schema

Migration file: `supabase/profile_customization.sql`

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS card_color text NOT NULL DEFAULT '#0f172a',
  ADD COLUMN IF NOT EXISTS card_text_color text NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS card_stickers jsonb NOT NULL DEFAULT '{"front":[],"back":[]}',
  ADD COLUMN IF NOT EXISTS selector_stickers jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS privacy_settings jsonb NOT NULL DEFAULT '{"show_email":false}';
```

### RLS

- **SELECT** on `profiles`: authenticated users (member page reads all)
- **UPDATE** on customization columns: own row only, matched by email local-part = `pbri_id`
- Identity columns protected via `BEFORE UPDATE` trigger — rejects changes to `full_name_th`, `nickname_th`, `section`, `pbri_id`, `complete_name_th`

## Shared Components

Extract from `member/page.tsx` into `src/components/member/`:

| Component | Responsibility |
|---|---|
| `MemberCardFront.tsx` | Card front with colors + stickers |
| `MemberCardBack.tsx` | Card back with optional email |
| `MemberInspectCard.tsx` | Wraps `InspectCard` |
| `AvatarSelectorItem.tsx` | Avatar button with selector stickers |
| `CrossfadeImage.tsx` | Image crossfade (shared utility) |

New libs:

| File | Responsibility |
|---|---|
| `src/lib/profileCustomization.ts` | Types, defaults, fetch/save, validation |
| `src/lib/colorPicker.ts` | Extracted color utils from announcements |
| `src/lib/stickerCatalog.ts` | Sticker asset list and slot definitions |

## Member Page Integration

- Extend profile fetch to include customization columns
- Pass customization into card and selector components
- Support `?member={id}` query param to pre-select current user's card
- Default card styling when columns are null/missing (use defaults)

## Error Handling

| Scenario | Behavior |
|---|---|
| Not logged in | Redirect to `/login?redirect=/profile` |
| Profile not found for auth user | Show "ไม่พบข้อมูลโปรไฟล์" with link home |
| Save fails | Inline error "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง" |
| Password change fails | Thai error from Supabase message mapping |
| Invalid sticker JSON from DB | Fall back to empty arrays |

## Testing

- Unit tests (Vitest): `profileCustomization.ts`, `colorPicker.ts` validation/normalization
- Manual QA: auth guard, save/reset, member page reflects changes, mobile layout, password change
