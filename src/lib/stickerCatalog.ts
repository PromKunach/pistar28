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

export const SELECTOR_SLOTS: {
  id: SelectorSticker["slot"];
  label: string;
  angle: number;
}[] = [
  { id: "top", label: "บน", angle: 0 },
  { id: "right", label: "ขวา", angle: 90 },
  { id: "bottom", label: "ล่าง", angle: 180 },
  { id: "left", label: "ซ้าย", angle: 270 },
];

export function getStickerSrc(id: string): string | undefined {
  return STICKER_CATALOG.find((s) => s.id === id)?.src;
}
