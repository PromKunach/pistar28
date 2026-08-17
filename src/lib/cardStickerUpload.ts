import type { CardSticker, ProfileCustomization } from "@/lib/profileCustomization";
import { canAddSticker } from "@/lib/stickerQuota";

export const ALLOWED_STICKER_TYPES = new Set(["image/png", "image/jpeg", "image/jpg"]);

function stickerExtension(mime: string, fileName: string): string {
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/png") return "png";
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpg";
  if (lower.endsWith(".png")) return "png";
  return "png";
}

function resolveMimeType(file: File): string {
  if (file.type && ALLOWED_STICKER_TYPES.has(file.type)) return file.type;
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return file.type;
}

export async function uploadCardSticker(
  profileId: string,
  file: File
): Promise<CardSticker> {
  const mimeType = resolveMimeType(file);
  if (!ALLOWED_STICKER_TYPES.has(mimeType)) {
    throw new Error("INVALID_TYPE");
  }

  const id = crypto.randomUUID();
  const ext = stickerExtension(mimeType, file.name);
  const storage_path = `images/stickers/${profileId}/${id}.${ext}`;

  const { supabase } = await import("@/lib/supabaseClient");
  const { error } = await supabase.storage.from("images").upload(storage_path, file, {
    contentType: mimeType === "image/jpg" ? "image/jpeg" : mimeType,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("images").getPublicUrl(storage_path);

  return {
    id,
    url: data.publicUrl,
    storage_path,
    size_bytes: file.size,
    x: 0.5,
    y: 0.5,
    scale: 1,
    rotation: 0,
  };
}

export function validateStickerUpload(
  customization: ProfileCustomization,
  file: File
): string | null {
  const mimeType = resolveMimeType(file);
  if (!ALLOWED_STICKER_TYPES.has(mimeType)) return "รองรับเฉพาะ PNG และ JPG";
  if (!canAddSticker(customization, file.size)) return "พื้นที่สติกเกอร์เต็ม (สูงสุด 1 MB ต่อผู้ใช้)";
  return null;
}

export async function deleteCardSticker(
  storage_path: string
): Promise<{ error: string | null }> {
  const { supabase } = await import("@/lib/supabaseClient");
  const { error } = await supabase.storage.from("images").remove([storage_path]);
  return { error: error?.message ?? null };
}

export async function deleteAllCardStickers(
  customization: ProfileCustomization
): Promise<void> {
  const paths = [
    ...customization.card_stickers.front,
    ...customization.card_stickers.back,
  ].map((s) => s.storage_path);
  if (paths.length === 0) return;
  const { supabase } = await import("@/lib/supabaseClient");
  await supabase.storage.from("images").remove(paths);
}
