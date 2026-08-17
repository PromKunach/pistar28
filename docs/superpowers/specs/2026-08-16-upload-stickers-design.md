# Upload-on-Place Card Stickers Design Spec

**Date:** 2026-08-16  
**Status:** Approved  
**Depends on:** Profile page customization (`/profile`)

## Summary

Replace the built-in sticker catalog with **upload-on-place** stickers. Users import PNG/JPG files directly onto their card while editing on `/profile`. Stickers are personal (only the uploader can add them) but visible to everyone on `/member`. No sticker library or reuse — each upload is tied to one placement on the card.

## Requirements

| Requirement | Detail |
|---|---|
| Upload trigger | "เพิ่มสติกเกอร์" button → file picker → upload → place on active card face |
| Formats | PNG, JPG (`image/png`, `image/jpeg`) |
| Quota | **2 MB total** across all stickers on the card (front + back combined) |
| Count | **Unlimited** sticker count (no per-face cap) |
| Reuse | **None** — no library; each file is uploaded once per placement |
| Movement | **Always draggable** while editing on `/profile` |
| Overflow | Stickers may extend **outside** the card border (`overflow: visible`) |
| Visibility | Others see stickers on `/member` (read-only, no drag) |
| Delete | Removing a sticker deletes its Storage file and frees quota |
| Reset | Card reset deletes all sticker Storage files and clears `card_stickers` |

## Non-Goals

- Shared global sticker pool
- Sticker library / catalog
- Re-selecting a previously uploaded sticker
- Animated GIF/WebP stickers
- Admin moderation queue

## Data Model

### `CardSticker` (updated)

```typescript
export type CardSticker = {
  id: string;           // uuid
  url: string;          // public Supabase Storage URL
  storage_path: string; // e.g. images/stickers/{profile_id}/{id}.jpg
  size_bytes: number;   // file size for quota accounting
  x: number;            // normalized position, can be <0 or >1 for overflow
  y: number;
  scale: number;        // 0.3 – 2.0
  rotation: number;     // degrees
};
```

Stored in existing `profiles.card_stickers` JSONB. Legacy catalog stickers (id-only, no `url`) are dropped during `normalizeCustomization`.

### Quota

```typescript
export const STICKER_QUOTA_BYTES = 2 * 1024 * 1024; // 2_097_152

export function sumStickerBytes(customization: ProfileCustomization): number;
export function canAddSticker(customization: ProfileCustomization, newBytes: number): boolean;
export function formatStickerQuota(used: number): string; // "1.2 / 2.0 MB"
```

### Storage

- **Bucket:** `images` (existing)
- **Path:** `images/stickers/{profile_id}/{sticker_id}.{ext}`
- **Max single file:** bounded by remaining quota (not a separate per-file cap)
- **RLS:** authenticated users upload/delete only under their own `profile_id` folder; all authenticated users can read (for `/member`)

## UI Flow

### `/profile` → ปรับแต่งการ์ด

1. Face toggle: ด้านหน้า / ด้านหลัง
2. **Quota bar:** `ใช้แล้ว 1.2 / 2.0 MB`
3. **"เพิ่มสติกเกอร์"** → hidden `<input type="file" accept="image/png,image/jpeg">`
4. On file select: validate type → check quota → upload → add sticker at `(0.5, 0.5)` on active face
5. Stickers render above full card face; **drag** to reposition anytime
6. **Tap sticker** → select → **ลบสติกเกอร์** (deletes Storage + removes from JSON)
7. **บันทึก** persists `card_stickers` to `profiles` (upload already done at add time)
8. **รีเซ็ต** confirms → delete all Storage files → `DEFAULT_CUSTOMIZATION`

### `/member`

- Renders stickers from `url` in JSON
- Card wrapper `overflow: visible`; photo area stays `overflow: hidden`
- No interaction

## Components

| File | Change |
|---|---|
| `src/lib/stickerQuota.ts` | **Create** — quota math |
| `src/lib/cardStickerUpload.ts` | **Create** — upload/delete Storage helpers |
| `src/lib/profileCustomization.ts` | **Modify** — `CardSticker` type, remove 5-cap, allow overflow coords |
| `src/components/member/CardStickerLayer.tsx` | **Modify** — render from `sticker.url` |
| `src/components/member/CardStickerEditor.tsx` | **Create** — draggable sticker overlay for edit mode |
| `src/components/profile/ProfileCardPreview.tsx` | **Modify** — upload flow, drag, overflow |
| `src/components/profile/CustomizePanel.tsx` | **Modify** — quota bar + add button; remove `StickerLibrary` |
| `src/components/member/MemberCardFront.tsx` | **Modify** — overflow visible, stickers on card root |
| `src/components/member/MemberCardBack.tsx` | **Modify** — same |
| `src/lib/stickerCatalog.ts` | **Delete** |
| `src/components/profile/StickerLibrary.tsx` | **Delete** |
| `public/stickers/*` | **Delete** |
| `supabase/card_sticker_storage.sql` | **Create** — Storage RLS policies |

## Error Handling

| Scenario | Thai message |
|---|---|
| Quota exceeded | `พื้นที่สติกเกอร์เต็ม (สูงสุด 2 MB)` |
| Invalid file type | `รองรับเฉพาะ PNG และ JPG` |
| Upload failed | `อัปโหลดไม่สำเร็จ กรุณาลองอีกครั้ง` |
| Delete failed | `ลบไม่สำเร็จ กรุณาลองอีกครั้ง` |

## Testing

- Unit: `stickerQuota.ts` — sum, canAdd, format
- Unit: `normalizeCustomization` — drops legacy stickers without `url`, preserves upload stickers
- Manual: upload, drag, overflow visible, quota bar, delete frees quota, member page shows stickers

## Migration

- No DB column changes (JSON shape evolves in `card_stickers`)
- Legacy catalog sticker IDs in existing rows become empty on next normalize (harmless)
- Apply `supabase/card_sticker_storage.sql` for Storage policies
