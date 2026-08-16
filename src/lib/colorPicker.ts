export const DEFAULT_TEXT_COLOR = "#404040";
export const DEFAULT_CARD_COLOR = "#ffffff";

export const TEXT_PRESETS = [
  "#404040",
  "#0f172a",
  "#ffffff",
  "#c2410c",
  "#1d4ed8",
  "#15803d",
  "#7e22ce",
  "#be123c",
];

export const CARD_PRESETS = [
  "#ffffff",
  "#f8fafc",
  "#0f172a",
  "#fff7ed",
  "#eff6ff",
  "#f0fdf4",
  "#faf5ff",
  "#fff1f2",
];

export const THEME_PAIRS: { label: string; textColor: string; cardColor: string }[] = [
  { label: "คลาสสิก", textColor: "#404040", cardColor: "#ffffff" },
  { label: "เที่ยงคืน", textColor: "#e2e8f0", cardColor: "#0f172a" },
  { label: "อรุณ", textColor: "#9a3412", cardColor: "#fff7ed" },
  { label: "มหาสมุทร", textColor: "#1e40af", cardColor: "#eff6ff" },
  { label: "ป่า", textColor: "#166534", cardColor: "#f0fdf4" },
  { label: "บาน", textColor: "#9f1239", cardColor: "#fff1f2" },
];

export function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) return withHash.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
    const [, r, g, b] = withHash;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex) ?? "#000000";
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const channel = (value: number) => {
    const srgb = value / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(foreground: string, background: string) {
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (light + 0.05) / (dark + 0.05);
}

export function readableTextColor(background: string) {
  return contrastRatio("#ffffff", background) >= contrastRatio("#111827", background)
    ? "#ffffff"
    : "#111827";
}

export function hexToHsv(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return { h: hue, s: max === 0 ? 0 : delta / max, v: max };
}

export function hsvToHex(h: number, s: number, v: number) {
  const chroma = v * s;
  const second = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const match = v - chroma;

  let rgb: [number, number, number];
  if (h < 60) rgb = [chroma, second, 0];
  else if (h < 120) rgb = [second, chroma, 0];
  else if (h < 180) rgb = [0, chroma, second];
  else if (h < 240) rgb = [0, second, chroma];
  else if (h < 300) rgb = [second, 0, chroma];
  else rgb = [chroma, 0, second];

  const channel = (value: number) =>
    Math.round((value + match) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${channel(rgb[0])}${channel(rgb[1])}${channel(rgb[2])}`;
}
