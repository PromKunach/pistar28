import { describe, expect, it } from "vitest";
import {
  buildCustomizationUpdatePayload,
  DEFAULT_CUSTOMIZATION,
  type ProfileCustomization,
} from "./profileCustomization";

describe("buildCustomizationUpdatePayload", () => {
  it("maps all customization fields for update", () => {
    const customization: ProfileCustomization = {
      ...DEFAULT_CUSTOMIZATION,
      card_color: "#ff0000",
      card_text_color: "#00ff00",
      card_stickers: {
        front: [{ id: "star-01", x: 0.5, y: 0.5, scale: 1, rotation: 0 }],
        back: [],
      },
      selector_stickers: [{ id: "heart-01", slot: "top" }],
      privacy_settings: { show_email: true },
    };

    expect(buildCustomizationUpdatePayload(customization)).toEqual({
      card_color: "#ff0000",
      card_text_color: "#00ff00",
      card_stickers: customization.card_stickers,
      selector_stickers: customization.selector_stickers,
      privacy_settings: { show_email: true },
    });
  });

  it("returns defaults unchanged", () => {
    expect(buildCustomizationUpdatePayload(DEFAULT_CUSTOMIZATION)).toEqual({
      card_color: "#0f172a",
      card_text_color: "#ffffff",
      card_stickers: { front: [], back: [] },
      selector_stickers: [],
      privacy_settings: { show_email: false },
    });
  });
});
