# Profile Bio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 160-character editable bio on the card back, simplify the back header to nickname-only, and remove the email show/hide privacy feature.

**Architecture:** Store `bio` as a new `profiles.bio` text column. Add `normalizeBio` + tests in `profileCustomization.ts`. Wire bio through `MemberProfile`, `MemberCardBack`, and the Customize panel save flow. Remove all `showEmail` / `privacy_settings.show_email` UI usage.

**Tech Stack:** Next.js 16.3 App Router, React 19, Supabase JS, Vitest, Tailwind 4

## Global Constraints

- Thai UI copy for all user-facing labels and errors
- Bio max length: **160** characters (`PROFILE_BIO_MAX_LENGTH`)
- Bio is **public** on `/member` for everyone
- Identity fields remain read-only on the client
- Explicit save via **บันทึก** in Customize panel (no auto-save)
- Empty bio shows **no placeholder** on the public card back
- Account panel always shows read-only email for the logged-in user

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `docs/superpowers/specs/2026-08-17-profile-bio-design.md` | Exists | Approved design spec |
| `supabase/profile_bio.sql` | Create | Add `bio` column migration |
| `src/lib/profileCustomization.ts` | Modify | `normalizeBio`, fetch/save `bio` |
| `src/lib/profileCustomization.test.ts` | Modify | Bio normalization tests |
| `src/lib/profileCustomization.fetch.test.ts` | Modify | Save payload includes `bio` |
| `src/components/member/types.ts` | Modify | `bio: string` on `MemberProfile` |
| `src/components/member/MemberCardBack.tsx` | Modify | Nickname header + bio body |
| `src/components/member/MemberInspectCard.tsx` | Modify | Remove `showEmail` prop |
| `src/components/profile/CustomizePanel.tsx` | Modify | Bio textarea + counter |
| `src/components/profile/ProfileCardPreview.tsx` | Modify | Remove `showEmail` prop |
| `src/components/profile/PrivacyPanel.tsx` | Modify | Remove email toggle + privacy save |
| `src/components/profile/AccountPanel.tsx` | Modify | Always show email |
| `src/app/(profile)/profile/page.tsx` | Modify | `draftBio` state, save/reset/cache |
| `src/app/(app)/member/page.tsx` | Modify | Fetch `bio`, remove `showEmail` |
| `src/lib/stickerQuota.test.ts` | Modify | Unchanged customization fixture (no bio) |

---

### Task 1: Migration + `normalizeBio` lib

**Files:**
- Create: `supabase/profile_bio.sql`
- Modify: `src/lib/profileCustomization.ts`
- Modify: `src/lib/profileCustomization.test.ts`

**Interfaces:**
- Produces:
  - `PROFILE_BIO_MAX_LENGTH = 160`
  - `normalizeBio(raw: unknown): string`
  - Updated `CUSTOMIZATION_SELECT` includes `bio`
  - `saveProfileCustomization(profileId: string, customization: ProfileCustomization, bio: string): Promise<{ error: string | null }>`
  - `fetchProfileByAuthEmail` returns `profile.bio: string`

- [ ] **Step 1: Write the failing test**

Add to `src/lib/profileCustomization.test.ts`:

```typescript
import {
  DEFAULT_CUSTOMIZATION,
  normalizeBio,
  normalizeCustomization,
  PROFILE_BIO_MAX_LENGTH,
} from "./profileCustomization";

describe("normalizeBio", () => {
  it("trims whitespace", () => {
    expect(normalizeBio("  hello  ")).toBe("hello");
  });

  it("truncates to max length", () => {
    const long = "ก".repeat(PROFILE_BIO_MAX_LENGTH + 20);
    expect(normalizeBio(long)).toHaveLength(PROFILE_BIO_MAX_LENGTH);
  });

  it("returns empty string for non-string input", () => {
    expect(normalizeBio(null)).toBe("");
    expect(normalizeBio(42)).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/profileCustomization.test.ts`

Expected: FAIL — `normalizeBio` is not exported

- [ ] **Step 3: Implement migration + lib**

Create `supabase/profile_bio.sql`:

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '';
```

In `src/lib/profileCustomization.ts`, add near top:

```typescript
export const PROFILE_BIO_MAX_LENGTH = 160;

export function normalizeBio(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, PROFILE_BIO_MAX_LENGTH);
}
```

Update `CUSTOMIZATION_SELECT`:

```typescript
export const CUSTOMIZATION_SELECT =
  "id, full_name_th, nickname_th, pbri_id, section, complete_name_th, card_color, card_text_color, card_stickers, selector_stickers, privacy_settings, bio";
```

In `fetchProfileByAuthEmail`, add to `MemberProfile` construction:

```typescript
bio: normalizeBio(row.bio),
```

Update `buildCustomizationUpdatePayload` → rename to `buildProfileSavePayload`:

```typescript
export function buildProfileSavePayload(
  customization: ProfileCustomization,
  bio: string
) {
  return {
    ...buildCustomizationUpdatePayload(customization),
    bio: normalizeBio(bio),
  };
}
```

Keep `buildCustomizationUpdatePayload` as-is for internal use; `saveProfileCustomization` becomes:

```typescript
export async function saveProfileCustomization(
  profileId: string,
  customization: ProfileCustomization,
  bio: string
): Promise<{ error: string | null }> {
  const { supabase } = await import("@/lib/supabaseClient");
  const { error } = await supabase
    .from("profiles")
    .update(buildProfileSavePayload(customization, bio))
    .eq("id", profileId);

  return { error: error?.message ?? null };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- --run src/lib/profileCustomization.test.ts src/lib/profileCustomization.fetch.test.ts`

Update `profileCustomization.fetch.test.ts` save payload expectation to include `bio: ""` if test asserts update shape.

- [ ] **Step 5: Commit**

```bash
git add supabase/profile_bio.sql src/lib/profileCustomization.ts src/lib/profileCustomization.test.ts src/lib/profileCustomization.fetch.test.ts
git commit -m "feat(profile): add bio column support and normalizeBio"
```

---

### Task 2: `MemberProfile` type + card back UI

**Files:**
- Modify: `src/components/member/types.ts`
- Modify: `src/components/member/MemberCardBack.tsx`

**Interfaces:**
- Consumes: `MemberProfile.bio: string`
- Produces: `MemberCardBack` renders nickname header + optional bio; no `showEmail` prop

- [ ] **Step 1: Update type**

In `src/components/member/types.ts`:

```typescript
export type MemberProfile = {
  id: string;
  full_name_th: string;
  nickname_th: string;
  pbri_id: string;
  section: string;
  url: string;
  email?: string;
  bio: string;
};
```

- [ ] **Step 2: Rewrite card back header + bio body**

Replace `MemberCardBack.tsx` header block with:

```tsx
export function MemberCardBack({
  profile,
  customization,
  stickerEdit,
}: {
  profile: MemberProfile;
  customization: ProfileCustomization;
  stickerEdit?: CardStickerEditProps;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const bio = profile.bio?.trim() ?? "";

  return (
    <div
      ref={cardRef}
      className="relative flex h-full w-full flex-col overflow-visible rounded-[1.75rem] shadow-[0_25px_50px_-12px_rgba(15,23,42,0.45)] ring-1 ring-black/10"
      style={{
        backgroundColor: customization.card_color,
        color: customization.card_text_color,
      }}
    >
      {/* dot pattern unchanged */}
      <div className="relative flex min-h-0 flex-1 flex-col p-3.5 sm:p-5">
        <div className="flex items-center gap-2.5 border-b border-current/10 pb-3 sm:gap-3 sm:pb-4">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-current/25 sm:h-11 sm:w-11">
            <img src={profile.url} alt="" decoding="async" draggable={false} className="h-full w-full object-cover" />
          </div>
          <p className="min-w-0 truncate text-sm font-semibold sm:text-base">
            {profile.nickname_th}
          </p>
        </div>

        {bio ? (
          <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed opacity-80 sm:mt-4 sm:text-sm">
            {bio}
          </p>
        ) : null}
      </div>

      {/* sticker layer unchanged */}
    </div>
  );
}
```

Remove `showEmail` prop entirely.

- [ ] **Step 3: Fix compile errors in callers** (temporary `bio: ""` until Task 5)

Grep for `MemberProfile` object literals and add `bio: ""` where needed.

- [ ] **Step 4: Commit**

```bash
git add src/components/member/types.ts src/components/member/MemberCardBack.tsx
git commit -m "feat(card): show nickname and bio on card back"
```

---

### Task 3: Remove `showEmail` from card wrappers

**Files:**
- Modify: `src/components/member/MemberInspectCard.tsx`
- Modify: `src/components/profile/ProfileCardPreview.tsx`

**Interfaces:**
- Produces: No `showEmail` prop on inspect card or preview components

- [ ] **Step 1: Update `MemberInspectCard.tsx`**

Remove `showEmail` from props and `<MemberCardBack>` usage:

```tsx
export function MemberInspectCard({
  profile,
  customization,
  resetKey,
  ariaLabel,
}: {
  profile: MemberProfile;
  customization: ProfileCustomization;
  resetKey?: string;
  ariaLabel?: string;
}) {
  // ...
  back={
    <MemberCardBack
      profile={profile}
      customization={customization}
    />
  }
}
```

- [ ] **Step 2: Update `ProfileCardPreview.tsx`**

Remove `showEmail` prop from component signature and both `MemberInspectCard` / `MemberCardBack` usages.

- [ ] **Step 3: Commit**

```bash
git add src/components/member/MemberInspectCard.tsx src/components/profile/ProfileCardPreview.tsx
git commit -m "refactor(card): remove showEmail from card preview components"
```

---

### Task 4: Customize panel bio editor

**Files:**
- Modify: `src/components/profile/CustomizePanel.tsx`

**Interfaces:**
- Consumes: `bio: string`, `onBioChange: (bio: string) => void`
- Produces: Textarea with 160-char limit and counter

- [ ] **Step 1: Add bio props and UI**

At top of `CustomizePanel.tsx`:

```typescript
import { PROFILE_BIO_MAX_LENGTH } from "@/lib/profileCustomization";
```

Extend props:

```typescript
export function CustomizePanel({
  draft,
  bio,
  onBioChange,
  onChange,
  // ...existing props
}: {
  draft: ProfileCustomization;
  bio: string;
  onBioChange: (bio: string) => void;
  // ...
}) {
```

Insert **above** `CardColorPicker`:

```tsx
<div>
  <label htmlFor="profile-bio" className="text-sm font-medium text-slate-900">
    Bio
  </label>
  <p className="mt-0.5 text-xs text-slate-500">
    แสดงบนด้านหลังการ์ด สูงสุด {PROFILE_BIO_MAX_LENGTH} ตัวอักษร
  </p>
  <textarea
    id="profile-bio"
    rows={3}
    value={bio}
    onChange={(event) =>
      onBioChange(event.target.value.slice(0, PROFILE_BIO_MAX_LENGTH))
    }
    className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
    placeholder="เขียนเกี่ยวกับตัวคุณ..."
  />
  <p className="mt-1 text-right text-xs text-slate-400">
    {bio.length}/{PROFILE_BIO_MAX_LENGTH}
  </p>
</div>
```

Update panel subtitle to: `เปลี่ยนสี สติกเกอร์ และ bio บนการ์ด`

- [ ] **Step 2: Commit**

```bash
git add src/components/profile/CustomizePanel.tsx
git commit -m "feat(profile): add bio editor to customize panel"
```

---

### Task 5: Profile page wiring (draftBio + save/reset)

**Files:**
- Modify: `src/app/(profile)/profile/page.tsx`

**Interfaces:**
- Consumes: `saveProfileCustomization(profileId, customization, bio)`
- Produces: Live preview uses `{ ...profile, bio: draftBio }`

- [ ] **Step 1: Add `draftBio` state**

```typescript
const [draftBio, setDraftBio] = useState("");
```

On load from `fetchProfileByAuthEmail`:

```typescript
setDraftBio(result.profile.bio);
```

Include `bio` in cache read/write via `profile.bio` (store on `MemberProfile` in cache).

- [ ] **Step 2: Update save handler**

```typescript
const { error } = await saveProfileCustomization(profile.id, normalized, draftBio);

// on success:
const savedBio = normalizeBio(draftBio);
setDraftBio(savedBio);
setProfile((prev) => (prev ? { ...prev, bio: savedBio } : prev));
writeProfileCache({
  email,
  profile: { ...profile, bio: savedBio },
  customization: normalized,
});
```

Import `normalizeBio` from `@/lib/profileCustomization`.

- [ ] **Step 3: Update reset handler**

```typescript
setDraft({ ...DEFAULT_CUSTOMIZATION });
setDraftBio("");
```

- [ ] **Step 4: Wire preview + customize panel**

```tsx
const profileWithEmail = { ...profile, email, bio: draftBio };

<ProfileCardPreview
  profile={profileWithEmail}
  customization={draft}
  // remove showEmail
/>

<CustomizePanel
  draft={draft}
  bio={draftBio}
  onBioChange={setDraftBio}
  onChange={setDraft}
  // ...
/>
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(profile)/profile/page.tsx
git commit -m "feat(profile): wire bio draft state and save flow"
```

---

### Task 6: Remove email privacy feature

**Files:**
- Modify: `src/components/profile/PrivacyPanel.tsx`
- Modify: `src/components/profile/AccountPanel.tsx`
- Modify: `src/app/(profile)/profile/page.tsx` (privacy section props)

**Interfaces:**
- Produces: `PrivacyPanel({ email })` — password + session only
- Produces: `AccountPanel({ profile, email })` — email always listed

- [ ] **Step 1: Simplify `PrivacyPanel.tsx`**

Remove props: `draft`, `onPrivacyChange`, `onSave`, `saving`, `saveMessage`.

Remove the entire email toggle block (lines with `แสดงอีเมล`).

Remove bottom **บันทึก** button section.

Update subtitle: `จัดการรหัสผ่านและเซสชัน`

Signature:

```typescript
export function PrivacyPanel({ email }: { email: string }) {
```

- [ ] **Step 2: Simplify `AccountPanel.tsx`**

Remove `showEmail` prop; always include email field:

```typescript
const fields = [
  { label: "ชื่อ-นามสกุล", value: profile.full_name_th },
  { label: "ชื่อเล่น", value: profile.nickname_th },
  { label: "รหัสนักศึกษา", value: profile.pbri_id },
  { label: "ฝ่าย", value: profile.section },
  { label: "อีเมล", value: email },
];
```

- [ ] **Step 3: Update profile page privacy/account sections**

```tsx
{section === "privacy" && <PrivacyPanel email={email} />}
{section === "account" && (
  <AccountPanel profile={profileWithEmail} email={email} />
)}
```

Remove `showEmail` variable.

- [ ] **Step 4: Commit**

```bash
git add src/components/profile/PrivacyPanel.tsx src/components/profile/AccountPanel.tsx src/app/(profile)/profile/page.tsx
git commit -m "refactor(profile): remove email visibility toggle"
```

---

### Task 7: Member page integration

**Files:**
- Modify: `src/app/(app)/member/page.tsx`

**Interfaces:**
- Consumes: `bio` from Supabase select
- Produces: `MemberProfile.bio` passed to `MemberInspectCard`

- [ ] **Step 1: Extend profile fetch select**

Change select string to include `bio`:

```typescript
"id, complete_name_th, pbri_id, nickname_th, section, full_name_th, card_color, card_text_color, card_stickers, selector_stickers, privacy_settings, bio"
```

- [ ] **Step 2: Map bio when building profiles**

When mapping rows to `Profile` objects, include:

```typescript
bio: normalizeBio(row.bio),
```

Import `normalizeBio` from `@/lib/profileCustomization`.

- [ ] **Step 3: Remove `showEmail` from `MemberDetailPanel`**

Delete:

```typescript
const showEmail =
  isOwnProfile && selectedProfile.customization.privacy_settings.show_email;
```

Remove `showEmail` prop from `<MemberInspectCard>`.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/member/page.tsx
git commit -m "feat(member): show public bio on member cards"
```

---

### Task 8: Apply migration + verification

**Files:**
- Run: `supabase/profile_bio.sql` on project `suqeemkfbmbslgfkqvph`

- [ ] **Step 1: Apply migration**

Use Supabase MCP `apply_migration` or SQL editor:

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '';
```

- [ ] **Step 2: Run unit tests**

Run: `npm test -- --run src/lib/profileCustomization.test.ts src/lib/profileCustomization.fetch.test.ts`

Expected: all PASS

- [ ] **Step 3: Manual QA checklist**

1. `/profile` → ปรับแต่งการ์ด → type bio → flip to ด้านหลัง → see nickname + bio
2. **บันทึก** → reload page → bio persists
3. **รีเซ็ต** → bio clears
4. `/member` → select your card → flip back → bio visible
5. Privacy panel has no email toggle; Account panel shows email
6. Card back header shows nickname only (no parentheses, no full name, no pbri_id)

- [ ] **Step 4: Commit** (if any test fixes)

```bash
git add -A
git commit -m "test(profile): verify bio feature end-to-end"
```

---

## Spec Self-Review

| Spec requirement | Task |
|---|---|
| `bio` column | Task 1, 8 |
| 160 char limit | Task 1, 4 |
| Public on `/member` | Task 7 |
| Bio in Customize panel | Task 4, 5 |
| Nickname-only back header | Task 2 |
| Bio on back body | Task 2 |
| Remove email toggle | Task 6 |
| Account email read-only | Task 6 |
| Empty bio no placeholder on card | Task 2 |
| Save/reset behavior | Task 5 |

No placeholders remain. `saveProfileCustomization` signature change is consistent across Tasks 1, 5, and fetch tests.
