import type { ProfileCustomization } from "@/lib/profileCustomization";

/** Total sticker bytes allowed per user profile (front + back combined). */
export const STICKER_QUOTA_BYTES = 1 * 1024 * 1024;

export function sumStickerBytes(customization: ProfileCustomization): number {
  const all = [
    ...customization.card_stickers.front,
    ...customization.card_stickers.back,
  ];
  return all.reduce((sum, sticker) => sum + (sticker.size_bytes || 0), 0);
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
