import { describe, expect, it } from "vitest";
import {
  DEFAULT_CUSTOMIZATION,
  normalizeBio,
  normalizeCustomization,
  clampSelectorStickers,
  PROFILE_BIO_MAX_LENGTH,
  type SelectorSticker,
} from "./profileCustomization";

describe("normalizeBio", () => {
  it("trims whitespace", () => {
    expect(normalizeBio("  hello  ")).toBe("hello");
  });

  it("truncates to max length", () => {
    const long = "ก".repeat(PROFILE_BIO_MAX_LENGTH + 20);
    expect(normalizeBio(long)).toHaveLength(PROFILE_BIO_MAX_LENGTH);
  });

  it("returns empty string for non-string input", () => {
    expect(normalizeBio(null)).toBe("");
    expect(normalizeBio(42)).toBe("");
  });
});

describe("normalizeCustomization", () => {
  it("returns defaults for null input", () => {
    expect(normalizeCustomization(null)).toEqual(DEFAULT_CUSTOMIZATION);
  });

  it("normalizes upload sticker", () => {
    const result = normalizeCustomization({
      card_color: "#ff0000",
      card_stickers: {
        front: [
          {
            id: "uuid-1",
            url: "https://example.com/s.png",
            storage_path: "images/stickers/1/uuid-1.png",
            size_bytes: 12000,
            x: 0.5,
            y: 0.5,
            scale: 1,
            rotation: 0,
          },
        ],
        back: [],
      },
    });
    expect(result.card_color).toBe("#ff0000");
    expect(result.card_stickers.front).toHaveLength(1);
    expect(result.card_stickers.front[0].url).toContain("example.com");
    expect(result.card_text_color).toBe("#ffffff");
  });

  it("drops legacy catalog stickers without url", () => {
    const result = normalizeCustomization({
      card_stickers: {
        front: [{ id: "star-01", x: 0.5, y: 0.5, scale: 1, rotation: 0 }],
        back: [],
      },
    });
    expect(result.card_stickers.front).toHaveLength(0);
  });

  it("rejects invalid hex colors", () => {
    const result = normalizeCustomization({ card_color: "not-a-color" });
    expect(result.card_color).toBe("#0f172a");
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
