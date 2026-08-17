"use client";

import type { CardSticker } from "@/lib/profileCustomization";

import { STICKER_BASE_PX } from "@/components/member/cardDimensions";

export function CardStickerLayer({ stickers }: { stickers: CardSticker[] }) {
  return (
    <>
      {stickers.map((sticker) => {
        const size = STICKER_BASE_PX * sticker.scale;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={sticker.id}
            src={sticker.url}
            alt=""
            draggable={false}
            className="pointer-events-none absolute z-20 object-contain"
            style={{
              left: `${sticker.x * 100}%`,
              top: `${sticker.y * 100}%`,
              width: size,
              height: size,
              transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`,
            }}
          />
        );
      })}
    </>
  );
}
