import { describe, expect, it } from "vitest";
import {
  DEFAULT_CUSTOMIZATION,
  normalizeCustomization,
  clampCardStickers,
  clampSelectorStickers,
  type CardSticker,
  type SelectorSticker,
} from "./profileCustomization";

describe("normalizeCustomization", () => {
  it("returns defaults for null input", () => {
    expect(normalizeCustomization(null)).toEqual(DEFAULT_CUSTOMIZATION);
  });

  it("normalizes partial input", () => {
    const result = normalizeCustomization({
      card_color: "#ff0000",
      card_stickers: {
        front: [{ id: "star-01", x: 0.5, y: 0.5, scale: 1, rotation: 0 }],
        back: [],
      },
    });
    expect(result.card_color).toBe("#ff0000");
    expect(result.card_stickers.front).toHaveLength(1);
    expect(result.card_text_color).toBe("#ffffff");
  });

  it("rejects invalid hex colors", () => {
    const result = normalizeCustomization({ card_color: "not-a-color" });
    expect(result.card_color).toBe("#0f172a");
  });
});

describe("clampCardStickers", () => {
  it("limits to 5 stickers per face", () => {
    const stickers: CardSticker[] = Array.from({ length: 8 }, (_, i) => ({
      id: `s-${i}`,
      x: 0.5,
      y: 0.5,
      scale: 1,
      rotation: 0,
    }));
    expect(clampCardStickers(stickers, "front")).toHaveLength(5);
  });
});

describe("clampSelectorStickers", () => {
  it("limits to 3 stickers", () => {
    const stickers: SelectorSticker[] = [
      { id: "a", slot: "top" },
      { id: "b", slot: "right" },
      { id: "c", slot: "bottom" },
      { id: "d", slot: "left" },
    ];
    expect(clampSelectorStickers(stickers)).toHaveLength(3);
  });

  it("deduplicates slots keeping last", () => {
    const stickers: SelectorSticker[] = [
      { id: "a", slot: "top" },
      { id: "b", slot: "top" },
    ];
    expect(clampSelectorStickers(stickers)).toHaveLength(1);
    expect(clampSelectorStickers(stickers)[0].id).toBe("b");
  });
});
