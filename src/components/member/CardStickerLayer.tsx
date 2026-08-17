"use client";

import type { CardSticker } from "@/lib/profileCustomization";

import { getStickerWidthPercent } from "@/components/member/cardDimensions";

export function CardStickerLayer({ stickers }: { stickers: CardSticker[] }) {
  return (
    <>
      {stickers.map((sticker) => {
        const widthPercent = getStickerWidthPercent(sticker.scale);
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
              width: `${widthPercent}%`,
              height: "auto",
              aspectRatio: "1",
              transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`,
            }}
          />
        );
      })}
    </>
  );
}
