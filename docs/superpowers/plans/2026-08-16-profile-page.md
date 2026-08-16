# Profile Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/profile` — a standalone settings page where authenticated users customize their member card (colors, stickers), manage privacy, and view account info; changes persist in Supabase and appear on `/member`.

**Architecture:** Approach A — single `/profile` page with `ProfileSidebar` switching panels. Extract shared member card components from `member/page.tsx`. Store customization in new `profiles` columns with RLS + identity-column trigger. Profile route group has its own layout excluded from `AppLayoutWrapper`.

**Tech Stack:** Next.js 16.3, React 19, Supabase JS 2.112, Tailwind 4, Motion 13, Vitest (new, lib tests only)

## Global Constraints

- Thai UI copy for all user-facing labels and errors
- Identity fields (`full_name_th`, `nickname_th`, `section`, `pbri_id`) are read-only on the client
- Default card colors: `card_color = #0f172a`, `card_text_color = #ffffff`
- Max 5 card stickers per face; max 3 selector stickers
- Explicit save (no auto-save in v1)
- App version string: `1.5.1`
- Profile route excluded from main app shell (`Sidebar` / `Topbar`)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/profile_customization.sql` | Create | Migration: columns, RLS, identity trigger |
| `src/lib/profileCustomization.ts` | Create | Types, defaults, fetch/save, validation |
| `src/lib/profileCustomization.test.ts` | Create | Unit tests |
| `src/lib/colorPicker.ts` | Create | Shared color utils extracted from announces |
| `src/lib/colorPicker.test.ts` | Create | Unit tests |
| `src/lib/stickerCatalog.ts` | Create | Sticker asset manifest + slot defs |
| `src/components/member/CrossfadeImage.tsx` | Create | Extracted image crossfade |
| `src/components/member/MemberCardFront.tsx` | Create | Card front with customization |
| `src/components/member/MemberCardBack.tsx` | Create | Card back with optional email |
| `src/components/member/MemberInspectCard.tsx` | Create | InspectCard wrapper |
| `src/components/member/AvatarSelectorItem.tsx` | Create | Avatar with selector stickers |
| `src/components/member/CardStickerLayer.tsx` | Create | Renders positioned stickers on card |
| `src/components/member/SelectorStickerRing.tsx` | Create | Stickers around avatar ring |
| `src/components/profile/ProfileSidebar.tsx` | Create | Profile nav sidebar |
| `src/components/profile/CardColorPicker.tsx` | Create | Color picker UI (uses colorPicker lib) |
| `src/components/profile/StickerLibrary.tsx` | Create | Sticker picker grid |
| `src/components/profile/CustomizePanel.tsx` | Create | Full customize editor |
| `src/components/profile/PrivacyPanel.tsx` | Create | Privacy settings |
| `src/components/profile/AccountPanel.tsx` | Create | Read-only account info |
| `src/components/profile/ProfileCardPreview.tsx` | Create | Live card preview with edit mode |
| `src/app/(profile)/layout.tsx` | Create | Profile shell layout |
| `src/app/(profile)/profile/page.tsx` | Create | Main profile page |
| `src/components/AppLayoutWrapper.tsx` | Modify | Exclude `/profile` |
| `src/components/Topbar.tsx` | Modify | Profile link → `/profile` |
| `src/app/(app)/member/page.tsx` | Modify | Use shared components + customization |
| `public/stickers/*.png` | Create | 12 placeholder sticker PNGs |
| `vitest.config.ts` | Create | Vitest config |
| `package.json` | Modify | Add vitest + test script |

---

### Task 1: Vitest setup + profileCustomization lib

**Files:**
- Create: `vitest.config.ts`
- Create: `src/lib/profileCustomization.ts`
- Create: `src/lib/profileCustomization.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces:
  - `ProfileCustomization` type
  - `PrivacySettings` type
  - `CardSticker` type
  - `SelectorSticker` type
  - `DEFAULT_CUSTOMIZATION: ProfileCustomization`
  - `normalizeCustomization(raw: unknown): ProfileCustomization`
  - `clampCardStickers(stickers: CardSticker[], face: 'front' | 'back'): CardSticker[]`
  - `clampSelectorStickers(stickers: SelectorSticker[]): SelectorSticker[]`

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest @vitejs/plugin-react
```

- [ ] **Step 2: Add test script to `package.json`**

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 4: Write failing tests in `src/lib/profileCustomization.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import {
  DEFAULT_CUSTOMIZATION,
  normalizeCustomization,
  clampCardStickers,
  clampSelectorStickers,
  type CardSticker,
  type SelectorSticker,
} from "./profileCustomization";

describe("normalizeCustomization", () => {
  it("returns defaults for null input", () => {
    expect(normalizeCustomization(null)).toEqual(DEFAULT_CUSTOMIZATION);
  });

  it("normalizes partial input", () => {
    const result = normalizeCustomization({
      card_color: "#ff0000",
      card_stickers: { front: [{ id: "star-01", x: 0.5, y: 0.5, scale: 1, rotation: 0 }], back: [] },
    });
    expect(result.card_color).toBe("#ff0000");
    expect(result.card_stickers.front).toHaveLength(1);
    expect(result.card_text_color).toBe("#ffffff");
  });

  it("rejects invalid hex colors", () => {
    const result = normalizeCustomization({ card_color: "not-a-color" });
    expect(result.card_color).toBe("#0f172a");
  });
});

describe("clampCardStickers", () => {
  it("limits to 5 stickers per face", () => {
    const stickers: CardSticker[] = Array.from({ length: 8 }, (_, i) => ({
      id: `s-${i}`,
      x: 0.5,
      y: 0.5,
      scale: 1,
      rotation: 0,
    }));
    expect(clampCardStickers(stickers, "front")).toHaveLength(5);
  });
});

describe("clampSelectorStickers", () => {
  it("limits to 3 stickers", () => {
    const stickers: SelectorSticker[] = [
      { id: "a", slot: "top" },
      { id: "b", slot: "right" },
      { id: "c", slot: "bottom" },
      { id: "d", slot: "left" },
    ];
    expect(clampSelectorStickers(stickers)).toHaveLength(3);
  });

  it("deduplicates slots keeping last", () => {
    const stickers: SelectorSticker[] = [
      { id: "a", slot: "top" },
      { id: "b", slot: "top" },
    ];
    expect(clampSelectorStickers(stickers)).toHaveLength(1);
    expect(clampSelectorStickers(stickers)[0].id).toBe("b");
  });
});
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `npm test`  
Expected: FAIL — module `./profileCustomization` not found

- [ ] **Step 6: Implement `src/lib/profileCustomization.ts`**

```typescript
export type CardSticker = {
  id: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export type SelectorSticker = {
  id: string;
  slot: "top" | "right" | "bottom" | "left";
};

export type CardStickers = {
  front: CardSticker[];
  back: CardSticker[];
};

export type PrivacySettings = {
  show_email: boolean;
};

export type ProfileCustomization = {
  card_color: string;
  card_text_color: string;
  card_stickers: CardStickers;
  selector_stickers: SelectorSticker[];
  privacy_settings: PrivacySettings;
};

const HEX_RE = /^#[0-9a-f]{6}$/;

export const DEFAULT_CUSTOMIZATION: ProfileCustomization = {
  card_color: "#0f172a",
  card_text_color: "#ffffff",
  card_stickers: { front: [], back: [] },
  selector_stickers: [],
  privacy_settings: { show_email: false },
};

const SELECTOR_SLOTS = new Set(["top", "right", "bottom", "left"]);

function normalizeHex(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().toLowerCase();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (/^#[0-9a-f]{3}$/.test(withHash)) {
    const [, r, g, b] = withHash;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return HEX_RE.test(withHash) ? withHash : fallback;
}

function normalizeCardSticker(raw: unknown): CardSticker | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string") return null;
  const x = typeof o.x === "number" ? Math.min(1, Math.max(0, o.x)) : 0.5;
  const y = typeof o.y === "number" ? Math.min(1, Math.max(0, o.y)) : 0.5;
  const scale = typeof o.scale === "number" ? Math.min(2, Math.max(0.3, o.scale)) : 1;
  const rotation = typeof o.rotation === "number" ? o.rotation : 0;
  return { id: o.id, x, y, scale, rotation };
}

function normalizeSelectorSticker(raw: unknown): SelectorSticker | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string") return null;
  const slot = o.slot;
  if (typeof slot !== "string" || !SELECTOR_SLOTS.has(slot)) return null;
  return { id: o.id, slot: slot as SelectorSticker["slot"] };
}

export function clampCardStickers(stickers: CardSticker[], _face: "front" | "back"): CardSticker[] {
  return stickers.slice(0, 5);
}

export function clampSelectorStickers(stickers: SelectorSticker[]): SelectorSticker[] {
  const bySlot = new Map<string, SelectorSticker>();
  for (const sticker of stickers) {
    bySlot.set(sticker.slot, sticker);
  }
  return Array.from(bySlot.values()).slice(0, 3);
}

export function normalizeCustomization(raw: unknown): ProfileCustomization {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_CUSTOMIZATION };

  const o = raw as Record<string, unknown>;
  const cardStickersRaw = o.card_stickers;
  let front: CardSticker[] = [];
  let back: CardSticker[] = [];

  if (cardStickersRaw && typeof cardStickersRaw === "object") {
    const cs = cardStickersRaw as Record<string, unknown>;
    if (Array.isArray(cs.front)) {
      front = cs.front.map(normalizeCardSticker).filter((s): s is CardSticker => s !== null);
    }
    if (Array.isArray(cs.back)) {
      back = cs.back.map(normalizeCardSticker).filter((s): s is CardSticker => s !== null);
    }
  }

  const selectorRaw = Array.isArray(o.selector_stickers) ? o.selector_stickers : [];
  const selector_stickers = clampSelectorStickers(
    selectorRaw.map(normalizeSelectorSticker).filter((s): s is SelectorSticker => s !== null)
  );

  const privacyRaw = o.privacy_settings;
  const privacy_settings: PrivacySettings = {
    show_email:
      privacyRaw &&
      typeof privacyRaw === "object" &&
      (privacyRaw as Record<string, unknown>).show_email === true,
  };

  return {
    card_color: normalizeHex(o.card_color, DEFAULT_CUSTOMIZATION.card_color),
    card_text_color: normalizeHex(o.card_text_color, DEFAULT_CUSTOMIZATION.card_text_color),
    card_stickers: {
      front: clampCardStickers(front, "front"),
      back: clampCardStickers(back, "back"),
    },
    selector_stickers,
    privacy_settings,
  };
}

export const CUSTOMIZATION_SELECT =
  "id, full_name_th, nickname_th, pbri_id, section, complete_name_th, card_color, card_text_color, card_stickers, selector_stickers, privacy_settings";
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test`  
Expected: PASS (all tests in `profileCustomization.test.ts`)

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/profileCustomization.ts src/lib/profileCustomization.test.ts
git commit -m "feat: add profile customization types and validation"
```

---

### Task 2: Supabase migration

**Files:**
- Create: `supabase/profile_customization.sql`

**Interfaces:**
- Produces: DB columns on `profiles` ready for client read/write

- [ ] **Step 1: Create `supabase/profile_customization.sql`**

```sql
-- Profile card customization columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS card_color text NOT NULL DEFAULT '#0f172a',
  ADD COLUMN IF NOT EXISTS card_text_color text NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS card_stickers jsonb NOT NULL DEFAULT '{"front":[],"back":[]}',
  ADD COLUMN IF NOT EXISTS selector_stickers jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS privacy_settings jsonb NOT NULL DEFAULT '{"show_email":false}';

-- Protect identity columns from client updates
CREATE OR REPLACE FUNCTION protect_profile_identity_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.full_name_th IS DISTINCT FROM OLD.full_name_th
     OR NEW.nickname_th IS DISTINCT FROM OLD.nickname_th
     OR NEW.complete_name_th IS DISTINCT FROM OLD.complete_name_th
     OR NEW.section IS DISTINCT FROM OLD.section
     OR NEW.pbri_id IS DISTINCT FROM OLD.pbri_id
  THEN
    RAISE EXCEPTION 'Cannot modify identity profile fields';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_profile_identity ON profiles;
CREATE TRIGGER protect_profile_identity
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_identity_columns();

-- RLS: users update only their own row (email local-part = pbri_id)
DROP POLICY IF EXISTS "Users update own customization" ON profiles;
CREATE POLICY "Users update own customization"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    pbri_id::text = split_part(auth.jwt() ->> 'email', '@', 1)
  )
  WITH CHECK (
    pbri_id::text = split_part(auth.jwt() ->> 'email', '@', 1)
  );
```

- [ ] **Step 2: Apply migration**

Run via Supabase MCP `apply_migration` or Supabase SQL editor with project `suqeemkfbmbslgfkqvph`.

- [ ] **Step 3: Verify columns exist**

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('card_color', 'card_text_color', 'card_stickers', 'selector_stickers', 'privacy_settings');
```

Expected: 5 rows returned.

- [ ] **Step 4: Commit**

```bash
git add supabase/profile_customization.sql
git commit -m "feat: add profile customization columns and RLS"
```

---

### Task 3: colorPicker lib extraction

**Files:**
- Create: `src/lib/colorPicker.ts`
- Create: `src/lib/colorPicker.test.ts`

**Interfaces:**
- Produces:
  - `normalizeHex(value: string): string | null`
  - `contrastRatio(foreground: string, background: string): number`
  - `readableTextColor(background: string): string`
  - `TEXT_PRESETS`, `CARD_PRESETS`, `THEME_PAIRS`, `DEFAULT_TEXT_COLOR`, `DEFAULT_CARD_COLOR`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, expect, it } from "vitest";
import { normalizeHex, contrastRatio, readableTextColor } from "./colorPicker";

describe("normalizeHex", () => {
  it("accepts 6-digit hex", () => {
    expect(normalizeHex("#ff0000")).toBe("#ff0000");
  });
  it("expands 3-digit hex", () => {
    expect(normalizeHex("#f00")).toBe("#ff0000");
  });
  it("rejects invalid", () => {
    expect(normalizeHex("red")).toBeNull();
  });
});

describe("contrastRatio", () => {
  it("returns high ratio for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeGreaterThan(10);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm test`

- [ ] **Step 3: Copy color functions from `src/app/(app)/announces/page.tsx` lines 94–126 and 141–200 into `src/lib/colorPicker.ts`**

Export all constants and functions listed in Interfaces above. Keep implementation identical to announces page to avoid visual regression.

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm test`

- [ ] **Step 5: Commit**

```bash
git add src/lib/colorPicker.ts src/lib/colorPicker.test.ts
git commit -m "feat: extract shared color picker utilities"
```

---

### Task 4: Sticker catalog + assets

**Files:**
- Create: `src/lib/stickerCatalog.ts`
- Create: `public/stickers/star-01.png` through `public/stickers/sparkle-06.png` (12 files)

**Interfaces:**
- Produces:
  - `STICKER_CATALOG: { id: string; label: string; src: string }[]`
  - `SELECTOR_SLOTS: { id: SelectorSticker['slot']; label: string; angle: number }[]`
  - `getStickerSrc(id: string): string | undefined`

- [ ] **Step 1: Create `src/lib/stickerCatalog.ts`**

```typescript
import type { SelectorSticker } from "@/lib/profileCustomization";

export const STICKER_CATALOG = [
  { id: "star-01", label: "ดาว", src: "/stickers/star-01.png" },
  { id: "star-02", label: "ดาว 2", src: "/stickers/star-02.png" },
  { id: "heart-01", label: "หัวใจ", src: "/stickers/heart-01.png" },
  { id: "heart-02", label: "หัวใจ 2", src: "/stickers/heart-02.png" },
  { id: "sparkle-01", label: "ประกาย", src: "/stickers/sparkle-01.png" },
  { id: "sparkle-02", label: "ประกาย 2", src: "/stickers/sparkle-02.png" },
  { id: "sparkle-03", label: "ประกาย 3", src: "/stickers/sparkle-03.png" },
  { id: "sparkle-04", label: "ประกาย 4", src: "/stickers/sparkle-04.png" },
  { id: "sparkle-05", label: "ประกาย 5", src: "/stickers/sparkle-05.png" },
  { id: "sparkle-06", label: "ประกาย 6", src: "/stickers/sparkle-06.png" },
  { id: "badge-01", label: "เหรียญ", src: "/stickers/badge-01.png" },
  { id: "badge-02", label: "เหรียญ 2", src: "/stickers/badge-02.png" },
] as const;

export const SELECTOR_SLOTS: { id: SelectorSticker["slot"]; label: string; angle: number }[] = [
  { id: "top", label: "บน", angle: 0 },
  { id: "right", label: "ขวา", angle: 90 },
  { id: "bottom", label: "ล่าง", angle: 180 },
  { id: "left", label: "ซ้าย", angle: 270 },
];

export function getStickerSrc(id: string): string | undefined {
  return STICKER_CATALOG.find((s) => s.id === id)?.src;
}
```

- [ ] **Step 2: Add 12 small PNG sticker assets to `public/stickers/`**

Use simple 64×64 PNG icons (stars, hearts, sparkles, badges). Can be minimal flat-color placeholders for v1.

- [ ] **Step 3: Commit**

```bash
git add src/lib/stickerCatalog.ts public/stickers/
git commit -m "feat: add sticker catalog and placeholder assets"
```

---

### Task 5: Extract shared member card components

**Files:**
- Create: `src/components/member/CrossfadeImage.tsx`
- Create: `src/components/member/MemberCardFront.tsx`
- Create: `src/components/member/MemberCardBack.tsx`
- Create: `src/components/member/MemberInspectCard.tsx`
- Create: `src/components/member/CardStickerLayer.tsx`
- Create: `src/components/member/SelectorStickerRing.tsx`
- Modify: `src/app/(app)/member/page.tsx`

**Interfaces:**
- Consumes: `ProfileCustomization`, `getStickerSrc` from earlier tasks
- Produces:
  - `MemberProfile` type: `{ id, full_name_th, nickname_th, pbri_id, section, url, email?: string }`
  - `MemberCardFront({ profile, customization, editable?, activeFace?, onPlaceSticker? })`
  - `MemberCardBack({ profile, customization, showEmail })`
  - `MemberInspectCard({ profile, customization, showEmail, resetKey?, ariaLabel? })`
  - `AvatarSelectorItem({ profile, customization, isSelected, onClick })`

- [ ] **Step 1: Move `CrossfadeImage` + `FadeInImage` from `member/page.tsx` into `CrossfadeImage.tsx`**

- [ ] **Step 2: Create `CardStickerLayer.tsx`**

Renders stickers as absolutely positioned `<img>` elements using normalized x/y (percentage), scale, rotation. `pointer-events-none` when not in edit mode.

```tsx
"use client";
import { getStickerSrc } from "@/lib/stickerCatalog";
import type { CardSticker } from "@/lib/profileCustomization";

export function CardStickerLayer({ stickers }: { stickers: CardSticker[] }) {
  return (
    <>
      {stickers.map((sticker) => {
        const src = getStickerSrc(sticker.id);
        if (!src) return null;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${sticker.id}-${sticker.x}-${sticker.y}`}
            src={src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute z-20 h-10 w-10 -translate-x-1/2 -translate-y-1/2 object-contain sm:h-12 sm:w-12"
            style={{
              left: `${sticker.x * 100}%`,
              top: `${sticker.y * 100}%`,
              transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
            }}
          />
        );
      })}
    </>
  );
}
```

- [ ] **Step 3: Create `MemberCardFront.tsx`**

Replace hardcoded `bg-slate-950` / `text-white` with `style={{ backgroundColor: customization.card_color, color: customization.card_text_color }}`. Render `<CardStickerLayer stickers={customization.card_stickers.front} />` inside the card container.

- [ ] **Step 4: Create `MemberCardBack.tsx`**

Same color theming. Show `profile.email` as extra line only when `showEmail` is true. Render back-face stickers.

- [ ] **Step 5: Create `MemberInspectCard.tsx`**

```tsx
import { InspectCard } from "@/components/ui/inspect-card";
import { MemberCardFront } from "./MemberCardFront";
import { MemberCardBack } from "./MemberCardBack";
import type { ProfileCustomization } from "@/lib/profileCustomization";

export function MemberInspectCard({
  profile,
  customization,
  showEmail = false,
  resetKey,
  ariaLabel,
}: {
  profile: MemberProfile;
  customization: ProfileCustomization;
  showEmail?: boolean;
  resetKey?: string | number | null;
  ariaLabel?: string;
}) {
  return (
    <InspectCard
      resetKey={resetKey}
      ariaLabel={ariaLabel ?? `การ์ดของ ${profile.full_name_th}`}
      front={<MemberCardFront profile={profile} customization={customization} />}
      back={
        <MemberCardBack
          profile={profile}
          customization={customization}
          showEmail={showEmail}
        />
      }
    />
  );
}
```

- [ ] **Step 6: Create `SelectorStickerRing.tsx`**

Position stickers at top/right/bottom/left around a circular avatar using `transform: rotate(angle) translateX(radius) rotate(-angle)`.

- [ ] **Step 7: Create `AvatarSelectorItem.tsx`**

Extract avatar button from `AvatarCarousel` in member page; wrap avatar with `SelectorStickerRing`.

- [ ] **Step 8: Update `member/page.tsx`**

- Import shared components
- Extend `Profile` type with customization fields
- Update Supabase select to include customization columns
- Pass `normalizeCustomization(row)` into card/selector components
- Remove inlined `CardFront`, `CardBack`, `CrossfadeImage`, duplicate avatar button markup

- [ ] **Step 9: Verify member page still works**

Run: `npm run dev`  
Open: `http://localhost:3000/member`  
Expected: member list and 3D card render with default dark theme (no visual regression)

- [ ] **Step 10: Commit**

```bash
git add src/components/member/ src/app/(app)/member/page.tsx
git commit -m "refactor: extract shared member card components"
```

---

### Task 6: Supabase fetch/save helpers

**Files:**
- Create: additions in `src/lib/profileCustomization.ts`
- Create: `src/lib/profileCustomization.fetch.test.ts` (mock-free tests for payload builder)

**Interfaces:**
- Produces:
  - `buildCustomizationUpdatePayload(customization: ProfileCustomization)`
  - `fetchProfileByAuthEmail(email: string): Promise<{ profile: MemberProfile; customization: ProfileCustomization } | null>`
  - `saveProfileCustomization(profileId: string, customization: ProfileCustomization): Promise<{ error: string | null }>`

- [ ] **Step 1: Add `buildCustomizationUpdatePayload` with test**

```typescript
export function buildCustomizationUpdatePayload(customization: ProfileCustomization) {
  return {
    card_color: customization.card_color,
    card_text_color: customization.card_text_color,
    card_stickers: customization.card_stickers,
    selector_stickers: customization.selector_stickers,
    privacy_settings: customization.privacy_settings,
  };
}
```

- [ ] **Step 2: Add fetch/save functions using `supabase` client and `CUSTOMIZATION_SELECT`**

`fetchProfileByAuthEmail`: extract studentId from email, query `profiles` by `pbri_id`, attach pfp url using same index logic as `userProfile.ts`.

`saveProfileCustomization`: `.update(buildCustomizationUpdatePayload(...)).eq('id', profileId)`.

- [ ] **Step 3: Run tests**

Run: `npm test`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/profileCustomization.ts src/lib/profileCustomization.fetch.test.ts
git commit -m "feat: add profile customization fetch and save helpers"
```

---

### Task 7: Profile layout + sidebar

**Files:**
- Create: `src/app/(profile)/layout.tsx`
- Create: `src/components/profile/ProfileSidebar.tsx`
- Modify: `src/components/AppLayoutWrapper.tsx`

**Interfaces:**
- Produces:
  - `ProfileSidebar({ activeSection, onSectionChange, user, onSignOut })`
  - `ProfileSection` type: `'customize' | 'privacy' | 'account'`

- [ ] **Step 1: Add `/profile` to `NO_LAYOUT_ROUTES` in `AppLayoutWrapper.tsx`**

```typescript
const NO_LAYOUT_ROUTES = ["/login", "/onboarding", "/profile"];
```

- [ ] **Step 2: Create `ProfileSidebar.tsx`**

240px sidebar with:
- Header: avatar, name, pbri_id
- Nav buttons: ปรับแต่งการ์ด, ความเป็นส่วนตัว, บัญชี
- Footer: กลับหน้าหลัก (`Link href="/"`), ออกจากระบบ button
- Mobile: same content inside a drawer triggered by hamburger in layout

- [ ] **Step 3: Create `src/app/(profile)/layout.tsx`**

```tsx
"use client";
import { useState } from "react";
import { ProfileSidebar, type ProfileSection } from "@/components/profile/ProfileSidebar";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-white text-slate-900">
      <ProfileSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center border-b border-slate-100 px-4 py-3 lg:hidden">
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            {/* Menu icon */}
          </button>
          <span className="ml-3 text-sm font-medium">โปรไฟล์</span>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
```

Note: active section state lives in `page.tsx` and is passed via React context or lifted — use a small `ProfilePageContext` in `page.tsx` rather than layout if simpler.

- [ ] **Step 4: Verify `/profile` renders without main sidebar**

Run: `npm run dev`  
Expected: blank profile page without main app Sidebar/Topbar

- [ ] **Step 5: Commit**

```bash
git add src/app/(profile)/layout.tsx src/components/profile/ProfileSidebar.tsx src/components/AppLayoutWrapper.tsx
git commit -m "feat: add profile layout with dedicated sidebar"
```

---

### Task 8: Profile page shell + auth guard

**Files:**
- Create: `src/app/(profile)/profile/page.tsx`

**Interfaces:**
- Consumes: `useCurrentUser`, `fetchProfileByAuthEmail`
- Produces: profile page with section switching and loading/error states

- [ ] **Step 1: Implement auth guard**

```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useCurrentUser } from "@/lib/userProfile";
import { fetchProfileByAuthEmail } from "@/lib/profileCustomization";
import type { ProfileSection } from "@/components/profile/ProfileSidebar";

export default function ProfilePage() {
  const router = useRouter();
  const { user, ready } = useCurrentUser();
  const [section, setSection] = useState<ProfileSection>("customize");
  // ... load profile + customization state
}
```

On `ready && !user`: `router.replace('/login?redirect=/profile')`.

- [ ] **Step 2: Load profile data on mount**

Show skeleton while loading. On missing profile: "ไม่พบข้อมูลโปรไฟล์".

- [ ] **Step 3: Desktop split layout**

Left/top: `ProfileCardPreview` (compact when section !== 'customize').  
Right/bottom: active panel component.

- [ ] **Step 4: Wire section state to `ProfileSidebar`**

- [ ] **Step 5: Manual verify auth redirect**

1. Sign out → visit `/profile` → redirects to login
2. Sign in → visit `/profile` → loads own card

- [ ] **Step 6: Commit**

```bash
git add src/app/(profile)/profile/page.tsx
git commit -m "feat: add profile page shell with auth guard"
```

---

### Task 9: Customize panel

**Files:**
- Create: `src/components/profile/CardColorPicker.tsx`
- Create: `src/components/profile/StickerLibrary.tsx`
- Create: `src/components/profile/ProfileCardPreview.tsx`
- Create: `src/components/profile/CustomizePanel.tsx`

**Interfaces:**
- Consumes: `CardColorPicker` from `colorPicker` lib; `STICKER_CATALOG`, `SELECTOR_SLOTS`
- Props: `draft: ProfileCustomization`, `onChange`, `onSave`, `onReset`, `saving`, `profile`

- [ ] **Step 1: Create `CardColorPicker.tsx`**

Port `ColorTargetPicker` UI from `announces/page.tsx` (lines 749–989) into a standalone component using `@/lib/colorPicker` imports. Labels: สีพื้นหลังการ์ด / สีข้อความ.

- [ ] **Step 2: Create `StickerLibrary.tsx`**

Grid of `STICKER_CATALOG` items. Click selects active sticker for placement.

- [ ] **Step 3: Create `ProfileCardPreview.tsx`**

- Renders `MemberInspectCard` with draft customization
- Face toggle: ด้านหน้า / ด้านหลัง
- In edit mode: clicking card places active sticker at click coordinates (convert clientX/Y to normalized 0–1)
- Selected sticker: show delete on click

- [ ] **Step 4: Create selector sticker sub-section in `CustomizePanel.tsx`**

Mini avatar preview + slot buttons (บน/ขวา/ล่าง/ซ้าย). Click slot + sticker to assign. Max 3.

- [ ] **Step 5: Save / Reset buttons**

```tsx
<Button onClick={onSave} disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึก"}</Button>
<Button variant="secondary" onClick={onReset}>รีเซ็ต</Button>
```

Reset shows `confirm("รีเซ็ตการตั้งค่าการ์ดทั้งหมด?")` then sets `DEFAULT_CUSTOMIZATION`.

- [ ] **Step 6: Wire save to `saveProfileCustomization`**

On success: toast "บันทึกแล้ว". On error: "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง".

- [ ] **Step 7: Manual verify**

1. Change card color → preview updates live
2. Place sticker on front → save → reload → persists
3. Add selector sticker → visible on mini preview

- [ ] **Step 8: Commit**

```bash
git add src/components/profile/
git commit -m "feat: add profile card customization panel"
```

---

### Task 10: Privacy + Account panels

**Files:**
- Create: `src/components/profile/PrivacyPanel.tsx`
- Create: `src/components/profile/AccountPanel.tsx`
- Modify: `src/components/Topbar.tsx`

**Interfaces:**
- `PrivacyPanel({ draft, onPrivacyChange, email, onPasswordChanged })`
- `AccountPanel({ profile, email, showEmail })`

- [ ] **Step 1: Create `PrivacyPanel.tsx`**

- Toggle: แสดงอีเมล → updates `draft.privacy_settings.show_email`
- Password form: รหัสผ่านปัจจุบัน, รหัสผ่านใหม่, ยืนยันรหัสผ่าน
- On submit:
  1. `supabase.auth.signInWithPassword({ email, password: current })` to verify
  2. `supabase.auth.updateUser({ password: newPassword })`
- Map errors to Thai strings
- Session info: "เข้าสู่ระบบอยู่" (read-only)

Privacy toggle saves with the same บันทึก button on the panel (or a dedicated save — use shared save bar at bottom of panel).

- [ ] **Step 2: Create `AccountPanel.tsx`**

Read-only fields table. Link:

```tsx
<Link href={`/member?member=${profile.id}`}>ดูการ์ดของฉันในหน้าสมาชิก</Link>
```

Show version `1.5.1`.

- [ ] **Step 3: Update Topbar Profile link**

In `Topbar.tsx` line 286, change `href="/member"` to `href="/profile"`.

- [ ] **Step 4: Manual verify**

1. Toggle show email → save → card back shows email when flipped
2. Change password with wrong current password → Thai error
3. Topbar Profile → `/profile`

- [ ] **Step 5: Commit**

```bash
git add src/components/profile/PrivacyPanel.tsx src/components/profile/AccountPanel.tsx src/components/Topbar.tsx
git commit -m "feat: add privacy and account panels, update profile link"
```

---

### Task 11: Member page customization integration

**Files:**
- Modify: `src/app/(app)/member/page.tsx`

**Interfaces:**
- Consumes: all shared member components from Task 5

- [ ] **Step 1: Extend Supabase query**

```typescript
.select("id, complete_name_th, pbri_id, nickname_th, section, full_name_th, card_color, card_text_color, card_stickers, selector_stickers, privacy_settings")
```

- [ ] **Step 2: Map rows with `normalizeCustomization`**

```typescript
const withImages = (data ?? []).map((row, i) => ({
  ...row,
  url: getPfpUrl(i),
  customization: normalizeCustomization(row),
}));
```

- [ ] **Step 3: Pass customization into `MemberInspectCard` and `AvatarSelectorItem`**

`showEmail={profile.customization.privacy_settings.show_email}` — email not stored on profile row; omit email on member page card back unless we add email to fetch (only show pbri_id on member page for others; email only when user opts in AND we have no email in profiles table — show masked email is not possible without storing or joining auth; **for member page viewing others, show email only if we add `public_email` column or fetch is owner-only**).

**Clarification for implementer:** On `/member`, when viewing another user's card back, do NOT show their auth email (not available client-side). Show `pbri_id` only. Email visibility applies only on own `/profile` preview and own card back when self-viewing on member page. Update spec behavior: `show_email` controls visibility on own profile page card back; member directory card back for others always shows `pbri_id` only.

- [ ] **Step 4: Support `?member={id}` query param**

On mount, read `searchParams.get('member')` and set `selectedId` if valid.

- [ ] **Step 5: Manual verify end-to-end**

1. Customize card on `/profile` → save
2. Open `/member` → your card shows new colors and stickers
3. Open `/member?member={yourId}` from account panel → pre-selected

- [ ] **Step 6: Commit**

```bash
git add src/app/(app)/member/page.tsx
git commit -m "feat: show profile customizations on member page"
```

---

### Task 12: Build verification + lint

**Files:**
- Modify: any files with lint errors

- [ ] **Step 1: Run unit tests**

Run: `npm test`  
Expected: all PASS

- [ ] **Step 2: Run production build**

Run: `npm run build`  
Expected: build succeeds with no type errors

- [ ] **Step 3: Run lint**

Run: `npm run lint`  
Expected: no new errors in changed files

- [ ] **Step 4: Manual QA checklist**

| # | Test | Expected |
|---|---|---|
| 1 | Visit `/profile` logged out | Redirect to login |
| 2 | Visit `/profile` logged in | Profile page with own card |
| 3 | Change colors + save | Persists after reload |
| 4 | Add card sticker + save | Visible on `/member` |
| 5 | Add selector sticker + save | Visible in member avatar carousel |
| 6 | Reset customization | Returns to defaults |
| 7 | Toggle show email + save | Email on own card back on `/profile` |
| 8 | Change password | Success with correct current password |
| 9 | Mobile layout | Sidebar drawer works, card stacks correctly |
| 10 | Topbar Profile link | Goes to `/profile` |

- [ ] **Step 5: Final commit if lint fixes needed**

```bash
git add -A
git commit -m "chore: fix lint issues for profile page feature"
```

---

## Plan Self-Review

**Spec coverage:**
- Approach A layout → Tasks 7, 8
- Customize (colors, stickers, selector) → Tasks 4, 5, 9
- Privacy panel → Task 10
- Account panel → Task 10
- Supabase persistence → Tasks 2, 6
- Member page integration → Tasks 5, 11
- Auth guard → Task 8
- Shared components → Task 5
- Error handling → Tasks 8, 9, 10

**Email visibility note:** Member page cannot show other users' auth emails client-side; plan limits email display to own profile preview only.

**No placeholders found.**

**Type consistency:** `ProfileCustomization`, `CardSticker`, `SelectorSticker` defined in Task 1 and used throughout.
