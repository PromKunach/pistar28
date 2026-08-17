# Upload-on-Place Card Stickers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the built-in sticker catalog with upload-on-place PNG/JPG stickers on the profile card — unlimited count, 2 MB total quota, draggable anytime, overflow-visible, visible on `/member`.

**Architecture:** Store sticker metadata (`url`, `storage_path`, `size_bytes`, position) directly in `profiles.card_stickers` JSONB. Upload to Supabase Storage at `images/stickers/{profile_id}/{id}.ext` on file pick. Quota enforced client-side before upload. `CardStickerEditor` handles drag; member page renders read-only from `url`.

**Tech Stack:** Next.js 16.3, React 19, Supabase JS 2.112, Vitest, existing `images` Storage bucket

## Global Constraints

- Thai UI copy for all user-facing labels and errors
- Sticker quota: **2_097_152 bytes (2 MB)** total across front + back combined
- Unlimited sticker count (no per-face cap)
- Formats: **PNG and JPG only** (`image/png`, `image/jpeg`)
- Upload on place — **no sticker library, no reuse**
- Stickers **always draggable** on `/profile` customize view
- Card face **overflow: visible** so stickers can extend outside card border
- Others see stickers on `/member` (read-only)
- Delete sticker → delete Storage file → free quota
- Reset card → delete all sticker Storage files

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/stickerQuota.ts` | Create | Quota sum, canAdd, format display |
| `src/lib/stickerQuota.test.ts` | Create | Unit tests |
| `src/lib/cardStickerUpload.ts` | Create | uploadCardSticker, deleteCardSticker, deleteAllCardStickers |
| `supabase/card_sticker_storage.sql` | Create | Storage RLS for `stickers/{profile_id}/` |
| `src/lib/profileCustomization.ts` | Modify | Updated `CardSticker` type, remove 5-cap, overflow coords |
| `src/lib/profileCustomization.test.ts` | Modify | Update tests for new sticker shape |
| `src/components/member/CardStickerLayer.tsx` | Modify | Render from `sticker.url` |
| `src/components/member/CardStickerEditor.tsx` | Create | Draggable sticker overlay |
| `src/components/member/MemberCardFront.tsx` | Modify | overflow visible, stickers on card root |
| `src/components/member/MemberCardBack.tsx` | Modify | same |
| `src/components/profile/ProfileCardPreview.tsx` | Modify | Upload trigger, editor integration |
| `src/components/profile/CustomizePanel.tsx` | Modify | Quota bar + add button, remove library |
| `src/app/(profile)/profile/page.tsx` | Modify | Upload/delete/reset handlers |
| `src/lib/stickerCatalog.ts` | Delete | Replaced by uploads |
| `src/components/profile/StickerLibrary.tsx` | Delete | Replaced by upload button |
| `public/stickers/*.png` | Delete | Placeholder assets |

---

### Task 1: Sticker quota utilities

**Files:**
- Create: `src/lib/stickerQuota.ts`
- Create: `src/lib/stickerQuota.test.ts`

**Interfaces:**
- Produces:
  - `STICKER_QUOTA_BYTES = 2_097_152`
  - `sumStickerBytes(customization: ProfileCustomization): number`
  - `canAddSticker(customization: ProfileCustomization, newBytes: number): boolean`
  - `formatStickerQuota(usedBytes: number): string`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, expect, it } from "vitest";
import {
  STICKER_QUOTA_BYTES,
  sumStickerBytes,
  canAddSticker,
  formatStickerQuota,
} from "./stickerQuota";
import type { ProfileCustomization } from "./profileCustomization";

const base: ProfileCustomization = {
  card_color: "#0f172a",
  card_text_color: "#ffffff",
  card_stickers: { front: [], back: [] },
  selector_stickers: [],
  privacy_settings: { show_email: false },
};

describe("sumStickerBytes", () => {
  it("sums front and back sticker sizes", () => {
    const c: ProfileCustomization = {
      ...base,
      card_stickers: {
        front: [
          {
            id: "a",
            url: "https://x/a.png",
            storage_path: "images/stickers/1/a.png",
            size_bytes: 100_000,
            x: 0.5,
            y: 0.5,
            scale: 1,
            rotation: 0,
          },
        ],
        back: [
          {
            id: "b",
            url: "https://x/b.png",
            storage_path: "images/stickers/1/b.png",
            size_bytes: 50_000,
            x: 0.5,
            y: 0.5,
            scale: 1,
            rotation: 0,
          },
        ],
      },
    };
    expect(sumStickerBytes(c)).toBe(150_000);
  });
});

describe("canAddSticker", () => {
  it("allows when under quota", () => {
    expect(canAddSticker(base, 1000)).toBe(true);
  });

  it("rejects when over quota", () => {
    const c: ProfileCustomization = {
      ...base,
      card_stickers: {
        front: [
          {
            id: "a",
            url: "u",
            storage_path: "p",
            size_bytes: STICKER_QUOTA_BYTES - 100,
            x: 0.5,
            y: 0.5,
            scale: 1,
            rotation: 0,
          },
        ],
        back: [],
      },
    };
    expect(canAddSticker(c, 200)).toBe(false);
  });
});

describe("formatStickerQuota", () => {
  it("formats MB display", () => {
    expect(formatStickerQuota(1_048_576)).toBe("1.0 / 2.0 MB");
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm test -- src/lib/stickerQuota.test.ts`  
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/lib/stickerQuota.ts`**

```typescript
import type { ProfileCustomization } from "@/lib/profileCustomization";

export const STICKER_QUOTA_BYTES = 2 * 1024 * 1024;

export function sumStickerBytes(customization: ProfileCustomization): number {
  const all = [
    ...customization.card_stickers.front,
    ...customization.card_stickers.back,
  ];
  return all.reduce((sum, s) => sum + (s.size_bytes || 0), 0);
}

export function canAddSticker(
  customization: ProfileCustomization,
  newBytes: number
): boolean {
  return sumStickerBytes(customization) + newBytes <= STICKER_QUOTA_BYTES;
}

export function formatStickerQuota(usedBytes: number): string {
  const usedMb = (usedBytes / (1024 * 1024)).toFixed(1);
  const totalMb = (STICKER_QUOTA_BYTES / (1024 * 1024)).toFixed(1);
  return `${usedMb} / ${totalMb} MB`;
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm test -- src/lib/stickerQuota.test.ts`  
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/stickerQuota.ts src/lib/stickerQuota.test.ts
git commit -m "feat: add card sticker quota utilities"
```

---

### Task 2: Update CardSticker type and normalization

**Files:**
- Modify: `src/lib/profileCustomization.ts`
- Modify: `src/lib/profileCustomization.test.ts`

**Interfaces:**
- Produces updated `CardSticker`:
  ```typescript
  export type CardSticker = {
    id: string;
    url: string;
    storage_path: string;
    size_bytes: number;
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
  ```
- `clampCardStickers` returns all stickers (no 5-cap)
- `normalizeCardSticker` requires `url` and `storage_path`; drops invalid/legacy entries
- Position `x`/`y` allowed in range `-0.5` to `1.5` for overflow

- [ ] **Step 1: Update `CardSticker` type and `normalizeCardSticker`**

```typescript
export type CardSticker = {
  id: string;
  url: string;
  storage_path: string;
  size_bytes: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

function normalizeCardSticker(raw: unknown): CardSticker | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string") return null;
  if (typeof o.url !== "string" || !o.url.trim()) return null;
  if (typeof o.storage_path !== "string" || !o.storage_path.trim()) return null;
  const size_bytes = typeof o.size_bytes === "number" && o.size_bytes > 0 ? o.size_bytes : 0;
  if (size_bytes === 0) return null;
  const clampPos = (v: unknown) =>
    typeof v === "number" ? Math.min(1.5, Math.max(-0.5, v)) : 0.5;
  const x = clampPos(o.x);
  const y = clampPos(o.y);
  const scale = typeof o.scale === "number" ? Math.min(2, Math.max(0.3, o.scale)) : 1;
  const rotation = typeof o.rotation === "number" ? o.rotation : 0;
  return { id: o.id, url: o.url, storage_path: o.storage_path, size_bytes, x, y, scale, rotation };
}

export function clampCardStickers(stickers: CardSticker[], _face: "front" | "back"): CardSticker[] {
  return stickers;
}
```

- [ ] **Step 2: Update tests — replace legacy sticker test data**

```typescript
it("normalizes upload sticker", () => {
  const result = normalizeCustomization({
    card_stickers: {
      front: [{
        id: "uuid-1",
        url: "https://example.com/s.png",
        storage_path: "images/stickers/1/uuid-1.png",
        size_bytes: 12000,
        x: 0.5, y: 0.5, scale: 1, rotation: 0,
      }],
      back: [],
    },
  });
  expect(result.card_stickers.front).toHaveLength(1);
  expect(result.card_stickers.front[0].url).toContain("example.com");
});

it("drops legacy catalog stickers without url", () => {
  const result = normalizeCustomization({
    card_stickers: {
      front: [{ id: "star-01", x: 0.5, y: 0.5, scale: 1, rotation: 0 }],
      back: [],
    },
  });
  expect(result.card_stickers.front).toHaveLength(0);
});
```

Remove the `clampCardStickers` "limits to 5" test.

- [ ] **Step 3: Run tests**

Run: `npm test`  
Expected: all PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/profileCustomization.ts src/lib/profileCustomization.test.ts
git commit -m "feat: extend CardSticker type for uploaded stickers"
```

---

### Task 3: Storage upload/delete helpers + RLS

**Files:**
- Create: `src/lib/cardStickerUpload.ts`
- Create: `supabase/card_sticker_storage.sql`

**Interfaces:**
- Produces:
  - `ALLOWED_STICKER_TYPES = new Set(["image/png", "image/jpeg"])`
  - `uploadCardSticker(profileId: string, file: File): Promise<CardSticker>`
  - `deleteCardSticker(storage_path: string): Promise<{ error: string | null }>`
  - `deleteAllCardStickers(customization: ProfileCustomization): Promise<void>`

- [ ] **Step 1: Create `supabase/card_sticker_storage.sql`**

```sql
-- Allow authenticated users to upload stickers to their own folder
CREATE POLICY "Users upload own stickers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images'
  AND (storage.foldername(name))[1] = 'stickers'
  AND (storage.foldername(name))[2] = (
    SELECT id::text FROM profiles
    WHERE pbri_id::text = split_part(auth.jwt() ->> 'email', '@', 1)
    LIMIT 1
  )
);

CREATE POLICY "Users delete own stickers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'images'
  AND (storage.foldername(name))[1] = 'stickers'
  AND (storage.foldername(name))[2] = (
    SELECT id::text FROM profiles
    WHERE pbri_id::text = split_part(auth.jwt() ->> 'email', '@', 1)
    LIMIT 1
  )
);

CREATE POLICY "Authenticated read stickers"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'images' AND (storage.foldername(name))[1] = 'stickers');
```

Apply via Supabase MCP `apply_migration` with name `card_sticker_storage`.

- [ ] **Step 2: Implement `src/lib/cardStickerUpload.ts`**

```typescript
import type { CardSticker, ProfileCustomization } from "@/lib/profileCustomization";
import { canAddSticker } from "@/lib/stickerQuota";

export const ALLOWED_STICKER_TYPES = new Set(["image/png", "image/jpeg"]);

function stickerExtension(mime: string): string {
  return mime === "image/jpeg" ? "jpg" : "png";
}

export async function uploadCardSticker(
  profileId: string,
  file: File
): Promise<CardSticker> {
  if (!ALLOWED_STICKER_TYPES.has(file.type)) {
    throw new Error("INVALID_TYPE");
  }

  const id = crypto.randomUUID();
  const ext = stickerExtension(file.type);
  const storage_path = `images/stickers/${profileId}/${id}.${ext}`;

  const { supabase } = await import("@/lib/supabaseClient");
  const { error } = await supabase.storage.from("images").upload(storage_path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("images").getPublicUrl(storage_path);

  return {
    id,
    url: data.publicUrl,
    storage_path,
    size_bytes: file.size,
    x: 0.5,
    y: 0.5,
    scale: 1,
    rotation: 0,
  };
}

export function validateStickerUpload(
  customization: ProfileCustomization,
  file: File
): string | null {
  if (!ALLOWED_STICKER_TYPES.has(file.type)) return "รองรับเฉพาะ PNG และ JPG";
  if (!canAddSticker(customization, file.size)) return "พื้นที่สติกเกอร์เต็ม (สูงสุด 2 MB)";
  return null;
}

export async function deleteCardSticker(
  storage_path: string
): Promise<{ error: string | null }> {
  const { supabase } = await import("@/lib/supabaseClient");
  const { error } = await supabase.storage.from("images").remove([storage_path]);
  return { error: error?.message ?? null };
}

export async function deleteAllCardStickers(
  customization: ProfileCustomization
): Promise<void> {
  const paths = [
    ...customization.card_stickers.front,
    ...customization.card_stickers.back,
  ].map((s) => s.storage_path);
  if (paths.length === 0) return;
  const { supabase } = await import("@/lib/supabaseClient");
  await supabase.storage.from("images").remove(paths);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/cardStickerUpload.ts supabase/card_sticker_storage.sql
git commit -m "feat: add card sticker upload and storage policies"
```

---

### Task 4: CardStickerLayer + member card overflow

**Files:**
- Modify: `src/components/member/CardStickerLayer.tsx`
- Modify: `src/components/member/MemberCardFront.tsx`
- Modify: `src/components/member/MemberCardBack.tsx`

**Interfaces:**
- `CardStickerLayer` renders `<img src={sticker.url}>` — no catalog lookup

- [ ] **Step 1: Rewrite `CardStickerLayer.tsx`**

```tsx
"use client";

import type { CardSticker } from "@/lib/profileCustomization";

export function CardStickerLayer({ stickers }: { stickers: CardSticker[] }) {
  return (
    <>
      {stickers.map((sticker) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={sticker.id}
          src={sticker.url}
          alt=""
          draggable={false}
          className="pointer-events-none absolute z-20 h-14 w-14 -translate-x-1/2 -translate-y-1/2 object-contain sm:h-16 sm:w-16"
          style={{
            left: `${sticker.x * 100}%`,
            top: `${sticker.y * 100}%`,
            transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
          }}
        />
      ))}
    </>
  );
}
```

- [ ] **Step 2: Update `MemberCardFront.tsx`**

- Change outer div: `overflow-hidden` → `overflow-visible`
- Remove `ring-1 ring-current/10` from photo area (fixes black pixel border)
- Remove `ring-1 ring-inset ring-current/10` overlay div
- Move `CardStickerLayer` from photo div to **card root** (after inner content, `z-20`):

```tsx
<div className="relative flex h-full w-full flex-col overflow-visible rounded-[1.75rem] ...">
  <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl">
    <CrossfadeImage ... />
    {/* id badge stays inside photo */}
  </div>
  <div className="mt-3 shrink-0">...</div>
  <CardStickerLayer stickers={customization.card_stickers.front} />
</div>
```

- [ ] **Step 3: Same changes to `MemberCardBack.tsx`**

- [ ] **Step 4: Manual verify on `/member`**

Legacy catalog stickers will not render (no url). Card should have no black ring on photo.

- [ ] **Step 5: Commit**

```bash
git add src/components/member/CardStickerLayer.tsx src/components/member/MemberCardFront.tsx src/components/member/MemberCardBack.tsx
git commit -m "fix: render upload stickers and remove card photo ring artifacts"
```

---

### Task 5: Draggable CardStickerEditor

**Files:**
- Create: `src/components/member/CardStickerEditor.tsx`

**Interfaces:**
- Props:
  ```typescript
  {
    stickers: CardSticker[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onMove: (id: string, x: number, y: number) => void;
    containerRef: RefObject<HTMLDivElement | null>;
  }
  ```

- [ ] **Step 1: Create `CardStickerEditor.tsx`**

Pointer-drag implementation:
- `onPointerDown` on sticker → capture pointer, record offset
- `onPointerMove` → compute `x,y` as fraction of container `getBoundingClientRect()` (allow -0.5 to 1.5)
- `onPointerUp` → release capture
- Selected sticker shows dashed border ring
- `pointer-events-auto` on stickers, `z-30`

```tsx
"use client";

import { useRef } from "react";
import type { CardSticker } from "@/lib/profileCustomization";
import { cn } from "@/lib/utils";

export function CardStickerEditor({
  stickers,
  selectedId,
  onSelect,
  onMove,
  containerRef,
}: {
  stickers: CardSticker[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const dragRef = useRef<{ id: string; pointerId: number } | null>(null);

  function toNormalized(clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0.5, y: 0.5 };
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    return {
      x: Math.min(1.5, Math.max(-0.5, x)),
      y: Math.min(1.5, Math.max(-0.5, y)),
    };
  }

  return (
    <>
      {stickers.map((sticker) => (
        <div
          key={sticker.id}
          data-sticker
          className={cn(
            "absolute z-30 touch-none",
            selectedId === sticker.id && "ring-2 ring-dashed ring-slate-900 rounded-sm"
          )}
          style={{
            left: `${sticker.x * 100}%`,
            top: `${sticker.y * 100}%`,
            transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            dragRef.current = { id: sticker.id, pointerId: e.pointerId };
            onSelect(sticker.id);
          }}
          onPointerMove={(e) => {
            if (dragRef.current?.id !== sticker.id) return;
            const { x, y } = toNormalized(e.clientX, e.clientY);
            onMove(sticker.id, x, y);
          }}
          onPointerUp={(e) => {
            if (dragRef.current?.id === sticker.id) {
              dragRef.current = null;
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sticker.url}
            alt=""
            draggable={false}
            className="h-14 w-14 object-contain sm:h-16 sm:w-16 pointer-events-none"
          />
        </div>
      ))}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/member/CardStickerEditor.tsx
git commit -m "feat: add draggable card sticker editor"
```

---

### Task 6: ProfileCardPreview upload integration

**Files:**
- Modify: `src/components/profile/ProfileCardPreview.tsx`

**Interfaces:**
- Remove `activeStickerId`, `onPlaceSticker` props
- Add: `onUploadSticker: (face: "front" | "back", file: File) => Promise<void>`
- Add: `onMoveSticker: (face, id, x, y) => void`
- Add: `onRemoveSticker: (face, id) => Promise<void>`
- Add: `uploading: boolean`

- [ ] **Step 1: Refactor `ProfileCardPreview`**

- Remove click-to-place catalog flow
- Add hidden file input + "เพิ่มสติกเกอร์" button above card
- Use `CardStickerEditor` overlay on card container (`overflow-visible`)
- Card container `ref` for coordinate math
- Delete button calls `onRemoveSticker(face, stickerId)` not index
- Help text: `ลากเพื่อย้าย · คลิกเพื่อเลือก · กดลบเพื่อนำออก`

- [ ] **Step 2: Commit**

```bash
git add src/components/profile/ProfileCardPreview.tsx
git commit -m "feat: integrate upload and drag in profile card preview"
```

---

### Task 7: CustomizePanel + profile page handlers

**Files:**
- Modify: `src/components/profile/CustomizePanel.tsx`
- Modify: `src/app/(profile)/profile/page.tsx`
- Delete: `src/components/profile/StickerLibrary.tsx`
- Delete: `src/lib/stickerCatalog.ts`
- Delete: `public/stickers/*.png`

**Interfaces:**
- CustomizePanel shows quota bar using `sumStickerBytes` + `formatStickerQuota`
- Remove `activeStickerId` / `onActiveStickerIdChange` props

- [ ] **Step 1: Update `profile/page.tsx` handlers**

```typescript
async function handleUploadSticker(face: "front" | "back", file: File) {
  if (!profile) return;
  const err = validateStickerUpload(draft, file);
  if (err) { setSaveMessage(err); return; }
  setUploading(true);
  try {
    const sticker = await uploadCardSticker(profile.id, file);
    setDraft((prev) => ({
      ...prev,
      card_stickers: {
        ...prev.card_stickers,
        [face]: [...prev.card_stickers[face], sticker],
      },
    }));
  } catch {
    setSaveMessage("อัปโหลดไม่สำเร็จ กรุณาลองอีกครั้ง");
  } finally {
    setUploading(false);
  }
}

function handleMoveSticker(face: "front" | "back", id: string, x: number, y: number) {
  setDraft((prev) => ({
    ...prev,
    card_stickers: {
      ...prev.card_stickers,
      [face]: prev.card_stickers[face].map((s) =>
        s.id === id ? { ...s, x, y } : s
      ),
    },
  }));
}

async function handleRemoveSticker(face: "front" | "back", id: string) {
  const sticker = draft.card_stickers[face].find((s) => s.id === id);
  if (sticker) {
    const { error } = await deleteCardSticker(sticker.storage_path);
    if (error) { setSaveMessage("ลบไม่สำเร็จ กรุณาลองอีกครั้ง"); return; }
  }
  setDraft((prev) => ({
    ...prev,
    card_stickers: {
      ...prev.card_stickers,
      [face]: prev.card_stickers[face].filter((s) => s.id !== id),
    },
  }));
}

async function handleReset() {
  await deleteAllCardStickers(draft);
  setDraft({ ...DEFAULT_CUSTOMIZATION });
}
```

- [ ] **Step 2: Update `CustomizePanel` — quota bar, remove StickerLibrary**

```tsx
import { formatStickerQuota, sumStickerBytes } from "@/lib/stickerQuota";

const used = sumStickerBytes(draft);
<p className="text-xs text-slate-500">
  พื้นที่สติกเกอร์: {formatStickerQuota(used)}
</p>
```

- [ ] **Step 3: Delete obsolete files**

```bash
rm src/components/profile/StickerLibrary.tsx
rm src/lib/stickerCatalog.ts
rm -rf public/stickers
```

- [ ] **Step 4: Grep for stale imports**

Run: `rg "stickerCatalog|StickerLibrary|getStickerSrc" src/`  
Expected: no matches

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: wire upload-on-place stickers and remove catalog"
```

---

### Task 8: Verification

**Files:** any lint fixes

- [ ] **Step 1: Run unit tests**

Run: `npm test`  
Expected: all PASS

- [ ] **Step 2: Run production build**

Run: `npm run build`  
Expected: success

- [ ] **Step 3: Manual QA**

| # | Test | Expected |
|---|---|---|
| 1 | Click เพิ่มสติกเกอร์, pick PNG | Sticker appears on card |
| 2 | Drag sticker | Moves freely, can hang off card edge |
| 3 | Upload until >2MB total | Error: พื้นที่สติกเกอร์เต็ม |
| 4 | Delete sticker | Removed, quota bar decreases |
| 5 | Save + reload | Stickers persist |
| 6 | Visit /member | Others see stickers on your card |
| 7 | Reset | All stickers gone, quota 0 / 2.0 MB |
| 8 | Photo area | No black pixel ring around image |

- [ ] **Step 4: Commit docs**

```bash
git add docs/superpowers/specs/2026-08-16-upload-stickers-design.md docs/superpowers/plans/2026-08-16-upload-stickers.md
git commit -m "docs: add upload stickers spec and implementation plan"
```

---

## Plan Self-Review

**Spec coverage:**
- Upload on place → Tasks 3, 6, 7
- 2 MB total quota → Tasks 1, 3, 7
- Unlimited count → Task 2 (remove 5-cap)
- PNG/JPG only → Task 3
- Draggable → Task 5, 6
- Overflow visible → Task 4
- Member visibility → Task 4
- Delete frees quota → Task 7
- Reset deletes files → Task 7
- Remove catalog → Task 7

**No placeholders found.**

**Type consistency:** `CardSticker` with `url`, `storage_path`, `size_bytes` defined in Task 2 and used throughout.
