import type { MemberProfile } from "@/components/member/types";

export type CardSticker = {
  id: string;
  url: string;
  storage_path: string;
  size_bytes: number;
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

const SELECTOR_SLOTS = new Set<string>(["top", "right", "bottom", "left"]);

export const DEFAULT_CUSTOMIZATION: ProfileCustomization = {
  card_color: "#0f172a",
  card_text_color: "#ffffff",
  card_stickers: { front: [], back: [] },
  selector_stickers: [],
  privacy_settings: { show_email: false },
};

export const PROFILE_BIO_MAX_LENGTH = 160;

export function normalizeBio(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, PROFILE_BIO_MAX_LENGTH);
}

export const STICKER_MIN_SCALE = 0.3;
export const STICKER_MAX_SCALE = 4;

export function clampStickerScale(value: number): number {
  return Math.min(STICKER_MAX_SCALE, Math.max(STICKER_MIN_SCALE, value));
}

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

function clampPosition(value: unknown): number {
  if (typeof value !== "number") return 0.5;
  return Math.min(1.5, Math.max(-0.5, value));
}

function normalizeCardSticker(raw: unknown): CardSticker | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string") return null;
  if (typeof o.url !== "string" || !o.url.trim()) return null;
  if (typeof o.storage_path !== "string" || !o.storage_path.trim()) return null;
  const size_bytes = typeof o.size_bytes === "number" && o.size_bytes > 0 ? o.size_bytes : 0;
  if (size_bytes === 0) return null;

  const scale =
    typeof o.scale === "number" ? clampStickerScale(o.scale) : 1;
  const rotation = typeof o.rotation === "number" ? o.rotation : 0;

  return {
    id: o.id,
    url: o.url,
    storage_path: o.storage_path,
    size_bytes,
    x: clampPosition(o.x),
    y: clampPosition(o.y),
    scale,
    rotation,
  };
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
  return stickers;
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
    show_email: Boolean(
      privacyRaw &&
        typeof privacyRaw === "object" &&
        (privacyRaw as Record<string, unknown>).show_email === true
    ),
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
  "id, full_name_th, nickname_th, pbri_id, section, complete_name_th, card_color, card_text_color, card_stickers, selector_stickers, privacy_settings, bio";

const PFP_COUNT = 32;

async function getPfpUrl(index: number) {
  const { supabase } = await import("@/lib/supabaseClient");
  const filename = `pfp_${(index % PFP_COUNT) + 1}.JPG`;
  const { data } = supabase.storage.from("images").getPublicUrl(`images/pfp/${filename}`);
  return data.publicUrl;
}

export function buildCustomizationUpdatePayload(customization: ProfileCustomization) {
  return {
    card_color: customization.card_color,
    card_text_color: customization.card_text_color,
    card_stickers: customization.card_stickers,
    selector_stickers: customization.selector_stickers,
    privacy_settings: customization.privacy_settings,
  };
}

export function buildProfileSavePayload(
  customization: ProfileCustomization,
  bio: string
) {
  return {
    ...buildCustomizationUpdatePayload(customization),
    bio: normalizeBio(bio),
  };
}

export async function fetchProfileByAuthEmail(
  email: string
): Promise<{ profile: MemberProfile; customization: ProfileCustomization; email: string } | null> {
  const { supabase } = await import("@/lib/supabaseClient");
  const studentId = email.split("@")[0]?.trim() ?? "";
  if (!studentId) return null;

  let { data: row } = await supabase
    .from("profiles")
    .select(CUSTOMIZATION_SELECT)
    .eq("pbri_id", studentId)
    .maybeSingle();

  if (!row && /^\d+$/.test(studentId)) {
    const { data } = await supabase
      .from("profiles")
      .select(CUSTOMIZATION_SELECT)
      .eq("pbri_id", Number(studentId))
      .maybeSingle();
    row = data;
  }

  if (!row) return null;

  const { data: orderedProfiles } = await supabase
    .from("profiles")
    .select("id")
    .order("id", { ascending: true });

  const index =
    orderedProfiles?.findIndex((profile) => String(profile.id) === String(row!.id)) ?? -1;
  const url = await getPfpUrl(index >= 0 ? index : Number(row.id) - 1);

  const profile: MemberProfile = {
    id: String(row.id),
    full_name_th: row.full_name_th ?? "",
    nickname_th: row.nickname_th ?? "",
    pbri_id: String(row.pbri_id ?? ""),
    section: row.section ?? "",
    url,
    email,
    bio: normalizeBio(row.bio),
  };

  return {
    profile,
    customization: normalizeCustomization(row),
    email,
  };
}

export async function saveProfileCustomization(
  profileId: string,
  customization: ProfileCustomization,
  bio: string
): Promise<{ error: string | null }> {
  const { supabase } = await import("@/lib/supabaseClient");
  const { error } = await supabase
    .from("profiles")
    .update(buildProfileSavePayload(customization, bio))
    .eq("id", profileId);

  return { error: error?.message ?? null };
}
