"use client";

import { getStickerSrc, SELECTOR_SLOTS } from "@/lib/stickerCatalog";
import type { SelectorSticker } from "@/lib/profileCustomization";

const RADIUS_PX = 38;

export function SelectorStickerRing({ stickers }: { stickers: SelectorSticker[] }) {
  return (
    <>
      {stickers.map((sticker) => {
        const slot = SELECTOR_SLOTS.find((s) => s.id === sticker.slot);
        const src = getStickerSrc(sticker.id);
        if (!slot || !src) return null;

        return (
          <div
            key={`${sticker.slot}-${sticker.id}`}
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 sm:h-6 sm:w-6"
            style={{
              transform: `rotate(${slot.angle}deg) translateX(${RADIUS_PX}px) rotate(-${slot.angle}deg)`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              draggable={false}
              className="h-full w-full object-contain"
            />
          </div>
        );
      })}
    </>
  );
}
