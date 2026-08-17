import type { CardSticker } from "@/lib/profileCustomization";

export type CardStickerEditProps = {
  stickers: CardSticker[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onScale: (id: string, scale: number) => void;
  onRotate: (id: string, rotation: number) => void;
};
