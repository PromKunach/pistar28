import { describe, expect, it } from "vitest";
import {
  STICKER_QUOTA_BYTES,
  sumStickerBytes,
  canAddSticker,
  formatStickerQuota,
} from "./stickerQuota";
import type { ProfileCustomization } from "./profileCustomization";

const base: ProfileCustomization = {
  card_color: "#0f172a",
  card_text_color: "#ffffff",
  card_stickers: { front: [], back: [] },
  selector_stickers: [],
  privacy_settings: { show_email: false },
};

const sampleSticker = {
  id: "a",
  url: "https://x/a.png",
  storage_path: "images/stickers/1/a.png",
  size_bytes: 100_000,
  x: 0.5,
  y: 0.5,
  scale: 1,
  rotation: 0,
};

describe("sumStickerBytes", () => {
  it("sums front and back sticker sizes", () => {
    const customization: ProfileCustomization = {
      ...base,
      card_stickers: {
        front: [sampleSticker],
        back: [{ ...sampleSticker, id: "b", size_bytes: 50_000 }],
      },
    };
    expect(sumStickerBytes(customization)).toBe(150_000);
  });
});

describe("canAddSticker", () => {
  it("allows when under quota", () => {
    expect(canAddSticker(base, 1000)).toBe(true);
  });

  it("rejects when over quota", () => {
    const customization: ProfileCustomization = {
      ...base,
      card_stickers: {
        front: [{ ...sampleSticker, size_bytes: STICKER_QUOTA_BYTES - 100 }],
        back: [],
      },
    };
    expect(canAddSticker(customization, 200)).toBe(false);
  });
});

describe("formatStickerQuota", () => {
  it("formats MB display", () => {
    expect(formatStickerQuota(1_048_576)).toBe("1.0 / 1.0 MB");
  });
});
