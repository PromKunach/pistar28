# Tools Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/tools` hub with three in-app utilities (QR generator, bill splitter, match maker) for logged-in members, including roster-based match making with blacklist, nickname, and profile photos.

**Architecture:** Client-only tools under `src/app/(app)/tools/`. Pure logic in `src/lib/` with Vitest tests. Match maker fetches the 32-member roster from Supabase `profiles`. Shared `RequireAuth` wrapper redirects guests to login. Hub + sub-routes pattern.

**Tech Stack:** Next.js 16.3 App Router, React 19, Supabase JS, Tailwind 4, Vitest, `qrcode` npm package, lucide-react icons

## Global Constraints

- Thai UI copy for all user-facing labels and errors
- Logged-in members only; redirect to `/login?redirect={currentPath}`
- Match maker roster: `profiles` ordered by `id` ascending; display `nickname_th` + `getPfpUrl(index)` avatar
- Blacklist is session-only (React state); not saved to Supabase
- Group mode supports **members per group** OR **number of groups** (user toggle)
- Pair mode: groups of 2; odd eligible member → solo group of 1
- Bill splitter: equal split + tip 0–100% + round modes `none | up | down | nearest`
- QR: text/URL input, live preview, PNG download
- Max content width ~800px; sub-pages link back to `/tools`
- Sidebar **เครื่องมือ** children point to in-app tool routes (remove external Cursor/Supabase links)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/memberRoster.ts` | Create | Fetch roster entries for tools |
| `src/lib/billSplitter.ts` | Create | Bill split calculation |
| `src/lib/billSplitter.test.ts` | Create | Unit tests |
| `src/lib/matchMaker.ts` | Create | Shuffle + pair/group split |
| `src/lib/matchMaker.test.ts` | Create | Unit tests |
| `src/components/tools/RequireAuth.tsx` | Create | Auth guard |
| `src/components/tools/ToolPageHeader.tsx` | Create | Back link + title |
| `src/components/tools/ToolHubCard.tsx` | Create | Hub card |
| `src/app/(app)/tools/page.tsx` | Replace | Tools hub |
| `src/app/(app)/tools/qr/page.tsx` | Create | QR tool |
| `src/app/(app)/tools/bill-splitter/page.tsx` | Create | Bill splitter |
| `src/app/(app)/tools/match-maker/page.tsx` | Create | Match maker |
| `src/components/tools/MemberBlacklistPicker.tsx` | Create | Avatar grid + blacklist toggle |
| `src/components/tools/MatchResults.tsx` | Create | Pair/group result display |
| `src/components/Sidebar.tsx` | Modify | In-app tool nav links |
| `package.json` | Modify | Add `qrcode` + `@types/qrcode` |

---

### Task 1: Pure logic libs (bill splitter + match maker)

**Files:**
- Create: `src/lib/billSplitter.ts`
- Create: `src/lib/billSplitter.test.ts`
- Create: `src/lib/matchMaker.ts`
- Create: `src/lib/matchMaker.test.ts`

**Interfaces:**
- Produces:
  - `export type RoundMode = 'none' | 'up' | 'down' | 'nearest'`
  - `export function calculateBillSplit(input: { total: number; people: number; tipPercent: number; roundMode: RoundMode }): { grandTotal: number; perPerson: number } | null`
  - `export function shuffle<T>(items: readonly T[]): T[]`
  - `export function splitIntoPairs<T>(items: readonly T[]): T[][]`
  - `export function splitByMembersPerGroup<T>(items: readonly T[], membersPerGroup: number): T[][]`
  - `export function splitByGroupCount<T>(items: readonly T[], groupCount: number): T[][]`

- [ ] **Step 1: Write failing bill splitter tests**

Create `src/lib/billSplitter.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { calculateBillSplit } from "./billSplitter";

describe("calculateBillSplit", () => {
  it("splits equally without tip", () => {
    const result = calculateBillSplit({
      total: 1000,
      people: 4,
      tipPercent: 0,
      roundMode: "none",
    });
    expect(result).toEqual({ grandTotal: 1000, perPerson: 250 });
  });

  it("applies tip before split", () => {
    const result = calculateBillSplit({
      total: 1000,
      people: 2,
      tipPercent: 10,
      roundMode: "none",
    });
    expect(result).toEqual({ grandTotal: 1100, perPerson: 550 });
  });

  it("rounds up per person", () => {
    const result = calculateBillSplit({
      total: 1000,
      people: 3,
      tipPercent: 0,
      roundMode: "up",
    });
    expect(result?.perPerson).toBe(334);
  });

  it("returns null for invalid input", () => {
    expect(
      calculateBillSplit({ total: 0, people: 2, tipPercent: 0, roundMode: "none" })
    ).toBeNull();
    expect(
      calculateBillSplit({ total: 100, people: 0, tipPercent: 0, roundMode: "none" })
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/billSplitter.test.ts`  
Expected: FAIL — module not found

- [ ] **Step 3: Implement billSplitter.ts**

Create `src/lib/billSplitter.ts`:

```typescript
export type RoundMode = "none" | "up" | "down" | "nearest";

export function calculateBillSplit(input: {
  total: number;
  people: number;
  tipPercent: number;
  roundMode: RoundMode;
}): { grandTotal: number; perPerson: number } | null {
  const { total, people, tipPercent, roundMode } = input;
  if (!Number.isFinite(total) || total <= 0) return null;
  if (!Number.isInteger(people) || people < 1) return null;
  if (!Number.isFinite(tipPercent) || tipPercent < 0 || tipPercent > 100) return null;

  const grandTotal = total * (1 + tipPercent / 100);
  const raw = grandTotal / people;

  let perPerson: number;
  switch (roundMode) {
    case "up":
      perPerson = Math.ceil(raw);
      break;
    case "down":
      perPerson = Math.floor(raw);
      break;
    case "nearest":
      perPerson = Math.round(raw);
      break;
    default:
      perPerson = Math.round(raw * 100) / 100;
  }

  return { grandTotal, perPerson };
}
```

- [ ] **Step 4: Write failing match maker tests**

Create `src/lib/matchMaker.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  splitByGroupCount,
  splitByMembersPerGroup,
  splitIntoPairs,
} from "./matchMaker";

describe("splitIntoPairs", () => {
  it("pairs even count", () => {
    expect(splitIntoPairs(["a", "b", "c", "d"])).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("leaves odd member solo", () => {
    expect(splitIntoPairs(["a", "b", "c"])).toEqual([["a", "b"], ["c"]]);
  });
});

describe("splitByMembersPerGroup", () => {
  it("chunks by size", () => {
    expect(splitByMembersPerGroup(["a", "b", "c", "d", "e"], 2)).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["e"],
    ]);
  });
});

describe("splitByGroupCount", () => {
  it("distributes evenly", () => {
    const groups = splitByGroupCount(["a", "b", "c", "d", "e"], 2);
    expect(groups).toHaveLength(2);
    expect(groups.flat()).toHaveLength(5);
  });
});
```

- [ ] **Step 5: Implement matchMaker.ts**

Create `src/lib/matchMaker.ts`:

```typescript
export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function splitIntoPairs<T>(items: readonly T[]): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    groups.push(items.slice(i, i + 2));
  }
  return groups;
}

export function splitByMembersPerGroup<T>(
  items: readonly T[],
  membersPerGroup: number
): T[][] {
  const size = Math.max(2, Math.min(16, Math.floor(membersPerGroup)));
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
}

export function splitByGroupCount<T>(items: readonly T[], groupCount: number): T[][] {
  const count = Math.max(2, Math.min(16, Math.floor(groupCount)));
  const shuffled = shuffle(items);
  const groups: T[][] = Array.from({ length: count }, () => []);
  shuffled.forEach((item, index) => {
    groups[index % count].push(item);
  });
  return groups.filter((group) => group.length > 0);
}

export function runMatch<T>(options: {
  items: readonly T[];
  mode: "pair" | "group";
  groupStrategy?: "per_group" | "group_count";
  membersPerGroup?: number;
  groupCount?: number;
}): T[][] {
  const pool = shuffle(options.items);
  if (options.mode === "pair") return splitIntoPairs(pool);
  if (options.groupStrategy === "group_count") {
    return splitByGroupCount(pool, options.groupCount ?? 2);
  }
  return splitByMembersPerGroup(pool, options.membersPerGroup ?? 4);
}
```

- [ ] **Step 6: Run all lib tests**

Run: `npm test -- --run src/lib/billSplitter.test.ts src/lib/matchMaker.test.ts`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/billSplitter.ts src/lib/billSplitter.test.ts src/lib/matchMaker.ts src/lib/matchMaker.test.ts
git commit -m "feat(tools): add bill splitter and match maker libs"
```

---

### Task 2: Member roster fetch + shared tool components

**Files:**
- Create: `src/lib/memberRoster.ts`
- Create: `src/components/tools/RequireAuth.tsx`
- Create: `src/components/tools/ToolPageHeader.tsx`
- Create: `src/components/tools/ToolHubCard.tsx`

**Interfaces:**
- Produces:
  - `export type MemberRosterEntry = { id: string; nickname_th: string; url: string }`
  - `export async function fetchMemberRoster(): Promise<MemberRosterEntry[]>`

- [ ] **Step 1: Create memberRoster.ts**

```typescript
import { supabase } from "@/lib/supabaseClient";
import { getPfpUrl } from "@/lib/userProfile";

export type MemberRosterEntry = {
  id: string;
  nickname_th: string;
  url: string;
};

export async function fetchMemberRoster(): Promise<MemberRosterEntry[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nickname_th")
    .order("id", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row, index) => ({
    id: String(row.id),
    nickname_th: row.nickname_th?.trim() || `สมาชิก ${row.id}`,
    url: getPfpUrl(index),
  }));
}
```

- [ ] **Step 2: Create RequireAuth.tsx**

```tsx
"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/userProfile";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, ready } = useCurrentUser();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [ready, user, router, pathname]);

  if (!ready || !user) {
    return (
      <div className="mx-auto max-w-[800px] animate-pulse px-4 py-6">
        <div className="h-8 w-48 rounded bg-slate-100" />
        <div className="mt-4 h-40 rounded-xl bg-slate-100" />
      </div>
    );
  }

  return <>{children}</>;
}
```

- [ ] **Step 3: Create ToolPageHeader.tsx**

```tsx
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function ToolPageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-6">
      <Link
        href="/tools"
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ChevronLeft className="h-4 w-4" />
        เครื่องมือทั้งหมด
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {description ? (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      ) : null}
    </header>
  );
}
```

- [ ] **Step 4: Create ToolHubCard.tsx**

```tsx
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function ToolHubCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/memberRoster.ts src/components/tools/
git commit -m "feat(tools): add roster fetch and shared tool components"
```

---

### Task 3: Tools hub page

**Files:**
- Replace: `src/app/(app)/tools/page.tsx`

**Interfaces:**
- Consumes: `RequireAuth`, `ToolHubCard`, lucide icons `QrCode`, `Receipt`, `Shuffle`

- [ ] **Step 1: Implement hub page**

```tsx
"use client";

import { QrCode, Receipt, Shuffle } from "lucide-react";
import { RequireAuth } from "@/components/tools/RequireAuth";
import { ToolHubCard } from "@/components/tools/ToolHubCard";

const TOOLS = [
  {
    href: "/tools/qr",
    title: "สร้าง QR Code",
    description: "แปลงข้อความหรือลิงก์เป็น QR",
    icon: QrCode,
  },
  {
    href: "/tools/bill-splitter",
    title: "แบ่งบิล",
    description: "หารค่าใช้จ่ายเท่าๆ กัน",
    icon: Receipt,
  },
  {
    href: "/tools/match-maker",
    title: "จับคู่ / แบ่งกลุ่ม",
    description: "สุ่มจากสมาชิก 32 คน",
    icon: Shuffle,
  },
] as const;

export default function ToolsPage() {
  return (
    <RequireAuth>
      <div className="mx-auto max-w-[800px] px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">เครื่องมือ</h1>
          <p className="mt-1 text-sm text-slate-500">เครื่องมืออำนวยความสะดวกสำหรับสมาชิก</p>
        </header>
        <div className="grid gap-3 sm:grid-cols-1">
          {TOOLS.map((tool) => (
            <ToolHubCard key={tool.href} {...tool} />
          ))}
        </div>
      </div>
    </RequireAuth>
  );
}
```

- [ ] **Step 2: Manual check**

Visit `/tools` while logged in — 3 cards visible.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/tools/page.tsx
git commit -m "feat(tools): add tools hub page"
```

---

### Task 4: QR generator page

**Files:**
- Modify: `package.json` (add `qrcode`, `@types/qrcode`)
- Create: `src/app/(app)/tools/qr/page.tsx`

**Interfaces:**
- Consumes: `RequireAuth`, `ToolPageHeader`, `qrcode` package `toDataURL`

- [ ] **Step 1: Install qrcode**

```bash
npm install qrcode
npm install -D @types/qrcode
```

- [ ] **Step 2: Create qr/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { RequireAuth } from "@/components/tools/RequireAuth";
import { ToolPageHeader } from "@/components/tools/ToolPageHeader";

export default function QrToolPage() {
  const [text, setText] = useState("");
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      setDataUrl(null);
      return;
    }
    void QRCode.toDataURL(trimmed, { width: 256, margin: 2 }).then(setDataUrl);
  }, [text]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "qrcode.png";
    link.click();
  };

  return (
    <RequireAuth>
      <div className="mx-auto max-w-[800px] px-4 py-6">
        <ToolPageHeader
          title="สร้าง QR Code"
          description="แปลงข้อความหรือลิงก์เป็น QR"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="พิมพ์ข้อความหรือวางลิงก์..."
          className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        {dataUrl ? (
          <div className="mt-6 flex flex-col items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUrl} alt="QR Code" className="h-64 w-64 rounded-lg border border-slate-200" />
            <Button type="button" onClick={handleDownload}>
              ดาวน์โหลด PNG
            </Button>
          </div>
        ) : null}
      </div>
    </RequireAuth>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json src/app/(app)/tools/qr/page.tsx
git commit -m "feat(tools): add QR code generator"
```

---

### Task 5: Bill splitter page

**Files:**
- Create: `src/app/(app)/tools/bill-splitter/page.tsx`

**Interfaces:**
- Consumes: `calculateBillSplit`, `RoundMode` from `@/lib/billSplitter`

- [ ] **Step 1: Implement bill-splitter/page.tsx**

Build form with:
- `total` (number), `people` (number min 1), `tipPercent` (0–100), `roundMode` (select)
- On change, call `calculateBillSplit` and show `grandTotal` + `perPerson`
- Show `กรุณากรอกยอดรวมและจำนวนคน` when result is null

Use `Input` + `Label` from `@/components/ui/`. Wrap in `RequireAuth` + `ToolPageHeader`.

Round select options:
```typescript
const ROUND_OPTIONS: { value: RoundMode; label: string }[] = [
  { value: "none", label: "ไม่ปัด" },
  { value: "up", label: "ปัดขึ้น" },
  { value: "down", label: "ปัดลง" },
  { value: "nearest", label: "ปัดใกล้ที่สุด" },
];
```

Result card:
```tsx
{result ? (
  <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-sm text-slate-600">ยอดรวมหลังทิป: <strong>{result.grandTotal.toLocaleString("th-TH")} บาท</strong></p>
    <p className="mt-2 text-lg font-semibold text-slate-900">คนละ {result.perPerson.toLocaleString("th-TH")} บาท</p>
  </div>
) : null}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/tools/bill-splitter/page.tsx
git commit -m "feat(tools): add bill splitter page"
```

---

### Task 6: Match maker UI components

**Files:**
- Create: `src/components/tools/MemberBlacklistPicker.tsx`
- Create: `src/components/tools/MatchResults.tsx`

**Interfaces:**
- Produces:
  - `MemberBlacklistPicker({ members, excludedIds, onToggle }: { members: MemberRosterEntry[]; excludedIds: Set<string>; onToggle: (id: string) => void })`
  - `MatchResults({ groups, membersById }: { groups: string[][]; membersById: Map<string, MemberRosterEntry> })`

- [ ] **Step 1: MemberBlacklistPicker**

Grid of clickable cards (avatar + nickname). Excluded state: `opacity-50 ring-2 ring-red-300` + badge `ยกเว้น`. Header shows `เข้าร่วม {eligible} / {total} คน`.

```tsx
"use client";

import Image from "next/image";
import type { MemberRosterEntry } from "@/lib/memberRoster";
import { cn } from "@/lib/utils";

export function MemberBlacklistPicker({
  members,
  excludedIds,
  onToggle,
}: {
  members: MemberRosterEntry[];
  excludedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const eligible = members.length - excludedIds.size;

  return (
    <div>
      <p className="mb-3 text-sm text-slate-600">
        เข้าร่วม {eligible} / {members.length} คน · แตะเพื่อยกเว้น
      </p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {members.map((member) => {
          const excluded = excludedIds.has(member.id);
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => onToggle(member.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition-colors",
                excluded
                  ? "border-red-200 bg-red-50 opacity-60"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              )}
            >
              <Image
                src={member.url}
                alt={member.nickname_th}
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover"
              />
              <span className="line-clamp-2 text-[10px] font-medium text-slate-700">
                {member.nickname_th}
              </span>
              {excluded ? (
                <span className="text-[9px] font-medium text-red-600">ยกเว้น</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: MatchResults**

```tsx
"use client";

import Image from "next/image";
import type { MemberRosterEntry } from "@/lib/memberRoster";

function MemberChip({ member }: { member: MemberRosterEntry }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs">
      <Image src={member.url} alt="" width={20} height={20} className="h-5 w-5 rounded-full object-cover" />
      {member.nickname_th}
    </span>
  );
}

export function MatchResults({
  groups,
  membersById,
  mode,
}: {
  groups: string[][];
  membersById: Map<string, MemberRosterEntry>;
  mode: "pair" | "group";
}) {
  return (
    <div className="space-y-4">
      {groups.map((group, index) => (
        <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            {mode === "pair" ? `คู่ที่ ${index + 1}` : `กลุ่ม ${index + 1}`}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.map((id) => {
              const member = membersById.get(id);
              if (!member) return null;
              return <MemberChip key={id} member={member} />;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/tools/MemberBlacklistPicker.tsx src/components/tools/MatchResults.tsx
git commit -m "feat(tools): add match maker UI components"
```

---

### Task 7: Match maker page

**Files:**
- Create: `src/app/(app)/tools/match-maker/page.tsx`

**Interfaces:**
- Consumes: `fetchMemberRoster`, `runMatch`, `MemberBlacklistPicker`, `MatchResults`

- [ ] **Step 1: Implement match-maker/page.tsx**

State:
- `members`, `loading`, `error`
- `excludedIds: Set<string>`
- `mode: 'pair' | 'group'`
- `groupStrategy: 'per_group' | 'group_count'`
- `membersPerGroup` (default 4), `groupCount` (default 4)
- `results: string[][] | null`

On mount: `fetchMemberRoster()`.

Toggle blacklist: flip id in `excludedIds` Set.

Eligible pool: `members.filter(m => !excludedIds.has(m.id)).map(m => m.id)`

**สุ่ม** button:
```typescript
const eligible = members.filter((m) => !excludedIds.has(m.id)).map((m) => m.id);
if (eligible.length < 2) return;
const groups = runMatch({
  items: eligible,
  mode,
  groupStrategy,
  membersPerGroup,
  groupCount,
});
setResults(groups);
```

UI sections:
1. Mode toggle: จับคู่ | แบ่งกลุ่ม
2. If group mode: strategy toggle + number input
3. `MemberBlacklistPicker`
4. Button **สุ่ม** (disabled if eligible < 2)
5. `MatchResults` when results non-null
6. **สุ่มใหม่** re-runs same logic

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/tools/match-maker/page.tsx
git commit -m "feat(tools): add match maker page with blacklist"
```

---

### Task 8: Sidebar + verification

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Update sidebar children**

Replace `NAV_BUILD` tools children:

```typescript
children: [
  { label: "เครื่องมือทั้งหมด", href: "/tools" },
  { label: "สร้าง QR Code", href: "/tools/qr" },
  { label: "แบ่งบิล", href: "/tools/bill-splitter" },
  { label: "จับคู่ / แบ่งกลุ่ม", href: "/tools/match-maker" },
],
```

- [ ] **Step 2: Run tests**

Run: `npm test -- --run src/lib/billSplitter.test.ts src/lib/matchMaker.test.ts`  
Expected: PASS

- [ ] **Step 3: Manual QA**

1. `/tools` — hub loads when logged in; redirects when guest
2. `/tools/qr` — type URL, preview appears, PNG downloads
3. `/tools/bill-splitter` — 1000 ÷ 4 = 250; tip 10% works
4. `/tools/match-maker` — blacklist 2 members, pair mode shuffles 30; group mode with 4 per group; group count mode
5. Sidebar links work

- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat(tools): update sidebar nav and verify tools pages"
```

---

## Spec Self-Review

| Spec requirement | Task |
|---|---|
| Hub + sub-routes | Task 3, 4, 5, 7 |
| Auth logged-in only | Task 2 `RequireAuth` on all pages |
| QR text/URL + download | Task 4 |
| Bill equal + tip + round | Task 1, 5 |
| Match pair + group modes | Task 1, 6, 7 |
| Members per group OR group count | Task 7 |
| Blacklist | Task 6, 7 |
| Nickname + avatar | Task 2, 6, 7 |
| Sidebar in-app links | Task 8 |
| Thai UI | All UI tasks |

No placeholders. `runMatch` signature consistent across Task 1 and Task 7.
