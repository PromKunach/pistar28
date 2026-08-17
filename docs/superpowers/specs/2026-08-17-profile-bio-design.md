# Profile Bio + Card Back Redesign

**Date:** 2026-08-17  
**Status:** Approved  
**Routes:** `/profile`, `/member`

## Summary

Add an editable **bio** field (max 160 characters) that appears on the **back face** of member cards. Simplify the back card header to show **nickname only** (no parentheses). Remove the **แสดงอีเมล** privacy toggle — users can include contact info in bio if they choose.

## Requirements

| Requirement | Detail |
|---|---|
| Bio storage | New `bio` column on `profiles` (`text NOT NULL DEFAULT ''`) |
| Bio limit | 160 characters, trimmed; multiline input (2–3 lines) |
| Bio visibility | Public on `/member` for all users (same as card colors/stickers) |
| Bio editor | **ปรับแต่งการ์ด** panel on `/profile`, live preview on card back |
| Save | Same **บันทึก** button as colors/stickers; **รีเซ็ต** clears bio |
| Back header | Avatar + **nickname only** — no `()`, no full name, no `pbri_id` |
| Back body | Bio text below header when non-empty |
| Empty bio | No placeholder on public card; helper text only in editor |
| Remove | `privacy_settings.show_email` toggle and all `showEmail` card-back rendering |
| Keep | Password change + session info in Privacy panel; read-only email in Account panel |

## Non-Goals

- Rich text / markdown in bio
- Bio privacy toggle (always public)
- Changing front card layout
- Removing `privacy_settings` DB column (leave column; stop using `show_email` in app)

## Card Back Layout

```
┌─────────────────────────────┐
│ [avatar]  ชื่อเล่น           │  ← nickname only, no ()
├─────────────────────────────┤
│ Bio text wraps here up to   │
│ 160 characters...           │
│                             │
│         [stickers]          │
└─────────────────────────────┘
```

## Customize Panel

| Control | Detail |
|---|---|
| Label | `Bio` |
| Input | `<textarea rows={3}>` |
| Counter | `{length}/160` |
| Helper | `แสดงบนด้านหลังการ์ด สูงสุด 160 ตัวอักษร` |

## Database

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '';
```

Existing RLS policy **Users update own customization** already allows authenticated users to update their own row — `bio` is included automatically.

## API / Lib Changes

- `MemberProfile.bio: string`
- `normalizeBio(raw: unknown): string` — trim, slice to 160
- `PROFILE_BIO_MAX_LENGTH = 160`
- `CUSTOMIZATION_SELECT` includes `bio`
- `saveProfileCustomization(profileId, customization, bio)` writes `bio` with customization columns

## Files Affected

| File | Change |
|---|---|
| `supabase/profile_bio.sql` | Migration |
| `src/lib/profileCustomization.ts` | bio fetch/save/normalize |
| `src/lib/profileCustomization.test.ts` | bio tests |
| `src/components/member/types.ts` | `bio` on `MemberProfile` |
| `src/components/member/MemberCardBack.tsx` | nickname header + bio body |
| `src/components/member/MemberInspectCard.tsx` | remove `showEmail` |
| `src/components/profile/CustomizePanel.tsx` | bio textarea |
| `src/components/profile/ProfileCardPreview.tsx` | remove `showEmail` |
| `src/components/profile/PrivacyPanel.tsx` | remove email toggle + save |
| `src/components/profile/AccountPanel.tsx` | always show email |
| `src/app/(profile)/profile/page.tsx` | `draftBio` state, save/reset |
| `src/app/(app)/member/page.tsx` | fetch `bio`, remove `showEmail` |

## Error Handling

| Scenario | Behavior |
|---|---|
| Bio over 160 on paste | Truncate on input change and on save normalize |
| Save fails | Existing Thai error: `บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง` |
| Missing `bio` column (dev) | Run migration; fetch returns null → normalize to `""` |

## Testing

- Unit: `normalizeBio` trim, truncate, non-string input
- Manual: edit bio on `/profile`, flip card back, verify on `/member`; confirm email toggle gone; Account panel still shows email
