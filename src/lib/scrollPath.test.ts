import { describe, expect, it } from "vitest";
import {
  clamp01,
  lerpHex,
  scrollProgress,
  segmentsForProgress,
} from "./scrollPath";

describe("clamp01", () => {
  it("clamps below 0 and above 1", () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(3)).toBe(1);
  });
});

describe("scrollProgress", () => {
  it("is 0 at the top and 1 at the bottom", () => {
    expect(scrollProgress(0, 2000, 1000)).toBe(0);
    expect(scrollProgress(1000, 2000, 1000)).toBe(1);
    expect(scrollProgress(500, 2000, 1000)).toBe(0.5);
  });

  it("returns 1 when there is no overflow", () => {
    expect(scrollProgress(0, 800, 800)).toBe(1);
  });

  it("clamps overscroll", () => {
    expect(scrollProgress(-20, 2000, 1000)).toBe(0);
    expect(scrollProgress(5000, 2000, 1000)).toBe(1);
  });
});

describe("lerpHex", () => {
  it("returns the start and end colors at 0 and 1", () => {
    expect(lerpHex("#F5C518", "#2563EB", 0)).toBe("#F5C518");
    expect(lerpHex("#F5C518", "#2563EB", 1)).toBe("#2563EB");
  });

  it("mixes channels at 0.5", () => {
    expect(lerpHex("#000000", "#FFFFFF", 0.5)).toBe("#808080");
  });
});

describe("segmentsForProgress", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 20, y: 0 },
  ];

  it("returns no segments at progress 0", () => {
    expect(segmentsForProgress(points, 0, "#000000", "#FFFFFF")).toEqual([]);
  });

  it("returns nothing with fewer than 2 points", () => {
    expect(segmentsForProgress([{ x: 0, y: 0 }], 1, "#000000", "#FFFFFF")).toEqual(
      []
    );
  });

  it("returns all segments at progress 1", () => {
    const segs = segmentsForProgress(points, 1, "#000000", "#FFFFFF");
    expect(segs).toHaveLength(2);
    expect(segs[0]).toMatchObject({ x1: 0, y1: 0, x2: 10, y2: 0 });
    expect(segs[1]).toMatchObject({ x1: 10, y1: 0, x2: 20, y2: 0 });
    expect(segs[0]?.color).toBe("#000000");
    expect(segs[1]?.color).toBe("#FFFFFF");
  });

  it("returns a partial last segment", () => {
    const segs = segmentsForProgress(points, 0.25, "#000000", "#FFFFFF");
    expect(segs).toHaveLength(1);
    expect(segs[0]).toMatchObject({ x1: 0, y1: 0, x2: 5, y2: 0 });
  });
});
