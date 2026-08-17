/** Shared inspect/member card dimensions — keep edit preview and /member in sync. */
export const MEMBER_CARD_DIMENSION_CLASS =
  "h-[22rem] w-[15.5rem] sm:h-[32rem] sm:w-[22.5rem] lg:h-[34rem] lg:w-[24rem]";

/** Card width at the `sm` breakpoint (22.5rem @ 16px). */
export const MEMBER_CARD_REFERENCE_WIDTH_PX = 360;

/** Sticker edge length at scale 1 on the reference card width. */
export const STICKER_BASE_PX = 56;

/** Sticker width as a fraction of card width so placement stays consistent across breakpoints. */
export const STICKER_BASE_CARD_WIDTH_RATIO =
  STICKER_BASE_PX / MEMBER_CARD_REFERENCE_WIDTH_PX;

export function getStickerWidthPercent(scale: number) {
  return scale * STICKER_BASE_CARD_WIDTH_RATIO * 100;
}
