"use client";

import { getStickerSrc } from "@/lib/stickerCatalog";
import type { CardSticker } from "@/lib/profileCustomization";

export function CardStickerLayer({
  stickers,
  editable = false,
}: {
  stickers: CardSticker[];
  editable?: boolean;
}) {
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
            className={`absolute z-20 h-10 w-10 -translate-x-1/2 -translate-y-1/2 object-contain sm:h-12 sm:w-12 ${
              editable ? "" : "pointer-events-none"
            }`}
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
