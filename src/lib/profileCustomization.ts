export type CardSticker = {
  id: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export type SelectorSticker = {
  id: string;
  slot: "top" | "right" | "bottom" | "left";
};

export type CardStickers = {
  front: CardSticker[];
  back: CardSticker[];
};

export type PrivacySettings = {
  show_email: boolean;
};

export type ProfileCustomization = {
  card_color: string;
  card_text_color: string;
  card_stickers: CardStickers;
  selector_stickers: SelectorSticker[];
  privacy_settings: PrivacySettings;
};

const HEX_RE = /^#[0-9a-f]{6}$/;

export const DEFAULT_CUSTOMIZATION: ProfileCustomization = {
  card_color: "#0f172a",
  card_text_color: "#ffffff",
  card_stickers: { front: [], back: [] },
  selector_stickers: [],
  privacy_settings: { show_email: false },
};

const SELECTOR_SLOTS = new Set(["top", "right", "bottom", "left"]);

function normalizeHex(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().toLowerCase();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (/^#[0-9a-f]{3}$/.test(withHash)) {
    const [, r, g, b] = withHash;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return HEX_RE.test(withHash) ? withHash : fallback;
}

function normalizeCardSticker(raw: unknown): CardSticker | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string") return null;
  const x = typeof o.x === "number" ? Math.min(1, Math.max(0, o.x)) : 0.5;
  const y = typeof o.y === "number" ? Math.min(1, Math.max(0, o.y)) : 0.5;
  const scale = typeof o.scale === "number" ? Math.min(2, Math.max(0.3, o.scale)) : 1;
  const rotation = typeof o.rotation === "number" ? o.rotation : 0;
  return { id: o.id, x, y, scale, rotation };
}

function normalizeSelectorSticker(raw: unknown): SelectorSticker | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string") return null;
  const slot = o.slot;
  if (typeof slot !== "string" || !SELECTOR_SLOTS.has(slot)) return null;
  return { id: o.id, slot: slot as SelectorSticker["slot"] };
}

export function clampCardStickers(
  stickers: CardSticker[],
  _face: "front" | "back"
): CardSticker[] {
  return stickers.slice(0, 5);
}

export function clampSelectorStickers(stickers: SelectorSticker[]): SelectorSticker[] {
  const bySlot = new Map<string, SelectorSticker>();
  for (const sticker of stickers) {
    bySlot.set(sticker.slot, sticker);
  }
  return Array.from(bySlot.values()).slice(0, 3);
}

export function normalizeCustomization(raw: unknown): ProfileCustomization {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_CUSTOMIZATION };

  const o = raw as Record<string, unknown>;
  const cardStickersRaw = o.card_stickers;
  let front: CardSticker[] = [];
  let back: CardSticker[] = [];

  if (cardStickersRaw && typeof cardStickersRaw === "object") {
    const cs = cardStickersRaw as Record<string, unknown>;
    if (Array.isArray(cs.front)) {
      front = cs.front
        .map(normalizeCardSticker)
        .filter((s): s is CardSticker => s !== null);
    }
    if (Array.isArray(cs.back)) {
      back = cs.back
        .map(normalizeCardSticker)
        .filter((s): s is CardSticker => s !== null);
    }
  }

  const selectorRaw = Array.isArray(o.selector_stickers) ? o.selector_stickers : [];
  const selector_stickers = clampSelectorStickers(
    selectorRaw
      .map(normalizeSelectorSticker)
      .filter((s): s is SelectorSticker => s !== null)
  );

  const privacyRaw = o.privacy_settings;
  const privacy_settings: PrivacySettings = {
    show_email:
      privacyRaw &&
      typeof privacyRaw === "object" &&
      (privacyRaw as Record<string, unknown>).show_email === true,
  };

  return {
    card_color: normalizeHex(o.card_color, DEFAULT_CUSTOMIZATION.card_color),
    card_text_color: normalizeHex(o.card_text_color, DEFAULT_CUSTOMIZATION.card_text_color),
    card_stickers: {
      front: clampCardStickers(front, "front"),
      back: clampCardStickers(back, "back"),
    },
    selector_stickers,
    privacy_settings,
  };
}

export const CUSTOMIZATION_SELECT =
  "id, full_name_th, nickname_th, pbri_id, section, complete_name_th, card_color, card_text_color, card_stickers, selector_stickers, privacy_settings";
