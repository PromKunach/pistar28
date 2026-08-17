export type Point = { x: number; y: number };

export type PathSegment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
};

export const HERO_SCROLL_VIEWBOX = "0 0 1200 640";
export const HERO_SCROLL_STROKE_WIDTH = 24;
export const HERO_SCROLL_SAMPLE_COUNT = 96;
export const HERO_SCROLL_COLOR_START = "#F5C518";
export const HERO_SCROLL_COLOR_END = "#2563EB";

export const HERO_SCROLL_PATH_D =
  "M 520 -30 C 500 100 430 150 300 175 C 120 210 30 300 55 410 C 85 540 280 590 420 510 C 515 455 545 355 455 325 C 350 288 275 365 330 445 C 385 525 560 555 740 515 C 900 480 1020 495 1125 455 C 1205 425 1210 500 1165 555 C 1120 610 980 640 860 615";

export function clamp01(n: number): number {
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

export function scrollProgress(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number
): number {
  const max = scrollHeight - clientHeight;
  if (max <= 0) return 1;
  return clamp01(scrollTop / max);
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function toHex(n: number): string {
  return n.toString(16).padStart(2, "0").toUpperCase();
}

export function lerpHex(start: string, end: string, t: number): string {
  const p = clamp01(t);
  const a = parseHex(start);
  const b = parseHex(end);
  return `#${toHex(Math.round(a.r + (b.r - a.r) * p))}${toHex(
    Math.round(a.g + (b.g - a.g) * p)
  )}${toHex(Math.round(a.b + (b.b - a.b) * p))}`;
}

export function segmentsForProgress(
  points: readonly Point[],
  progress: number,
  startColor: string,
  endColor: string
): PathSegment[] {
  if (points.length < 2) return [];
  const p = clamp01(progress);
  if (p === 0) return [];

  const segCount = points.length - 1;
  const drawn = p * segCount;
  const fullCount = Math.min(Math.floor(drawn), segCount);
  const frac = drawn - Math.floor(drawn);
  const segments: PathSegment[] = [];

  const colorAt = (index: number): string => {
    if (segCount <= 1) return lerpHex(startColor, endColor, p);
    return lerpHex(startColor, endColor, index / (segCount - 1));
  };

  for (let i = 0; i < fullCount; i++) {
    const from = points[i];
    const to = points[i + 1];
    if (!from || !to) continue;
    segments.push({
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      color: colorAt(i),
    });
  }

  if (frac > 0 && fullCount < segCount) {
    const from = points[fullCount];
    const to = points[fullCount + 1];
    if (from && to) {
      segments.push({
        x1: from.x,
        y1: from.y,
        x2: from.x + (to.x - from.x) * frac,
        y2: from.y + (to.y - from.y) * frac,
        color: colorAt(fullCount),
      });
    }
  }

  return segments;
}
