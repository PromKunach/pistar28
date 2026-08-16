import { describe, expect, it } from "vitest";
import { normalizeHex, contrastRatio } from "./colorPicker";

describe("normalizeHex", () => {
  it("accepts 6-digit hex", () => {
    expect(normalizeHex("#ff0000")).toBe("#ff0000");
  });

  it("expands 3-digit hex", () => {
    expect(normalizeHex("#f00")).toBe("#ff0000");
  });

  it("rejects invalid", () => {
    expect(normalizeHex("red")).toBeNull();
  });
});

describe("contrastRatio", () => {
  it("returns high ratio for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeGreaterThan(10);
  });
});
