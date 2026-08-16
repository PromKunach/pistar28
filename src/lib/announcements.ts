import { supabase } from "@/lib/supabaseClient"
import { resolveUserProfile, type CurrentUser } from "@/lib/userProfile"

export type ImageFocus = {
  x: number
  y: number
  zoom: number
}

const DEFAULT_IMAGE_FOCUS: ImageFocus = { x: 50, y: 50, zoom: 1 }

function clampImageFocusValue(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

export function normalizeImageFocus(value: unknown): ImageFocus {
  if (typeof value === "string") {
    try {
      return normalizeImageFocus(JSON.parse(value))
    } catch {
      return DEFAULT_IMAGE_FOCUS
    }
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    if ("x" in record && "y" in record && "zoom" in record) {
      return {
        x: clampImageFocusValue(Number(record.x), 0, 100),
        y: clampImageFocusValue(Number(record.y), 0, 100),
        zoom: clampImageFocusValue(Number(record.zoom), 1, 3),
      }
    }
  }

  return DEFAULT_IMAGE_FOCUS
}

function isPostgrestSingleRowError(error: unknown) {
  if (!error || typeof error !== "object") return false
  const code = "code" in error ? String((error as { code: string }).code) : ""
  const message = "message" in error ? String((error as { message: string }).message) : ""
  return (
    code === "PGRST116" ||
    message.includes("0 rows") ||
    message.includes("single JSON")
  )
}

export function announcementMutationErrorMessage(error: unknown) {
  if (isPostgrestSingleRowError(error)) {
    return "บันทึกไม่สำเร็จ — คุณไม่มีสิทธิ์แก้ไขโน้ตนี้ หรือโน้ตถูกลบแล้ว"
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: string }).message)
    if (message.includes("announcements") && message.includes("does not exist")) {
      return "ไม่พบตาราง announcements กรุณารัน supabase/announcements.sql ก่อน"
    }
    if (message.includes("row-level security") || message.includes("permission denied")) {
      return "ไม่มีสิทธิ์บันทึก ตรวจสอบนโยบาย RLS ใน Supabase"
    }
    if (message.includes("Bucket not found") || message.includes("storage")) {
      return "อัปโหลดรูปไม่สำเร็จ ตรวจสอบ bucket images และนโยบาย storage"
    }
    return message
  }

  return "บันทึกโน้ตประกาศไม่ได้ กรุณาลองใหม่อีกครั้ง"
}

export type AnnouncementRecord = {
  id: string
  author_pbri_id: string
  name: string
  description: string
  icon_id: string
  text_color: string
  card_color: string
  image_focus: ImageFocus
  image_storage_path: string | null
  image_file_name: string | null
  image_mime_type: string | null
  image_size_bytes: number | null
  image_original_size_bytes: number | null
  created_at: string
}

export type CreateAnnouncementInput = {
  name: string
  description: string
  iconId: string
  textColor: string
  cardColor: string
  imageFocus: ImageFocus
  imageBlob: Blob | null
  imageName: string | null
  imageMeta: { originalSize: number; compressedSize: number } | null
  author: CurrentUser
}

export type UpdateAnnouncementInput = {
  id: string
  name: string
  description: string
  iconId: string
  textColor: string
  cardColor: string
  imageFocus: ImageFocus
  /** New image to upload, or null when the image is unchanged/removed. */
  imageBlob: Blob | null
  imageName: string | null
  imageMeta: { originalSize: number; compressedSize: number } | null
  /** True when the existing image should be dropped without a replacement. */
  imageRemoved: boolean
  /** Storage path currently saved on the record, used for cleanup. */
  previousStoragePath: string | null
}

export function getAnnouncementImageUrl(storagePath: string | null) {
  if (!storagePath) return null
  const { data } = supabase.storage.from("images").getPublicUrl(storagePath)
  return data.publicUrl
}

export async function uploadAnnouncementImage(blob: Blob, storagePath: string) {
  const { error } = await supabase.storage.from("images").upload(storagePath, blob, {
    contentType: "image/webp",
    upsert: false,
  })
  if (error) throw error
}

export async function createAnnouncement(
  input: CreateAnnouncementInput
): Promise<AnnouncementRecord> {
  const imageId = crypto.randomUUID()
  const storagePath = input.imageBlob ? `images/announces/${imageId}.webp` : null

  if (input.imageBlob && storagePath) {
    await uploadAnnouncementImage(input.imageBlob, storagePath)
  }

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      author_pbri_id: input.author.studentId,
      name: input.name,
      description: input.description,
      icon_id: input.iconId,
      text_color: input.textColor,
      card_color: input.cardColor,
      image_focus: normalizeImageFocus(input.imageFocus),
      image_storage_path: storagePath,
      image_file_name: input.imageName,
      image_mime_type: input.imageBlob ? "image/webp" : null,
      image_size_bytes: input.imageMeta?.compressedSize ?? null,
      image_original_size_bytes: input.imageMeta?.originalSize ?? null,
    })
    .select()
    .maybeSingle()

  if (error) {
    if (storagePath) {
      await supabase.storage.from("images").remove([storagePath])
    }
    throw error
  }

  if (!data) {
    throw new Error("บันทึกโน้ตประกาศไม่สำเร็จ")
  }

  return data as AnnouncementRecord
}

export async function updateAnnouncement(
  input: UpdateAnnouncementInput
): Promise<AnnouncementRecord> {
  const imageId = crypto.randomUUID()
  const nextStoragePath = input.imageBlob
    ? `images/announces/${imageId}.webp`
    : null

  if (input.imageBlob && nextStoragePath) {
    await uploadAnnouncementImage(input.imageBlob, nextStoragePath)
  }

  const imageChanged = Boolean(input.imageBlob) || input.imageRemoved

  const updatePayload: Record<string, unknown> = {
    name: input.name,
    description: input.description,
    icon_id: input.iconId,
    text_color: input.textColor,
    card_color: input.cardColor,
    image_focus: normalizeImageFocus(input.imageFocus),
  }

  if (imageChanged) {
    updatePayload.image_storage_path = nextStoragePath
    updatePayload.image_file_name = input.imageBlob ? input.imageName : null
    updatePayload.image_mime_type = input.imageBlob ? "image/webp" : null
    updatePayload.image_size_bytes = input.imageMeta?.compressedSize ?? null
    updatePayload.image_original_size_bytes = input.imageMeta?.originalSize ?? null
  }

  const { data, error } = await supabase
    .from("announcements")
    .update(updatePayload)
    .eq("id", input.id)
    .select()
    .maybeSingle()

  if (error) {
    if (nextStoragePath) {
      await supabase.storage.from("images").remove([nextStoragePath])
    }
    throw error
  }

  if (!data) {
    if (nextStoragePath) {
      await supabase.storage.from("images").remove([nextStoragePath])
    }
    throw new Error("บันทึกไม่สำเร็จ — คุณไม่มีสิทธิ์แก้ไขโน้ตนี้ หรือโน้ตถูกลบแล้ว")
  }

  if (imageChanged && input.previousStoragePath) {
    await supabase.storage.from("images").remove([input.previousStoragePath])
  }

  return data as AnnouncementRecord
}

export async function deleteAnnouncement(record: {
  id: string
  image_storage_path: string | null
}): Promise<void> {
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", record.id)

  if (error) throw error

  if (record.image_storage_path) {
    await supabase.storage.from("images").remove([record.image_storage_path])
  }
}

export async function fetchAnnouncements(): Promise<AnnouncementRecord[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as AnnouncementRecord[]
}

export async function fetchAnnouncement(
  id: string
): Promise<AnnouncementRecord | null> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  return (data as AnnouncementRecord | null) ?? null
}

export async function resolveAuthorForPbriId(pbriId: string): Promise<CurrentUser> {
  const email = `${pbriId}@pi.ac.th`
  const profile = await resolveUserProfile(email)
  return (
    profile ?? {
      studentId: pbriId,
      displayName: pbriId,
      email,
    }
  )
}

export async function resolveAuthorsForRecords(
  records: AnnouncementRecord[]
): Promise<Map<string, CurrentUser>> {
  const ids = [...new Set(records.map((record) => record.author_pbri_id))]
  const entries = await Promise.all(
    ids.map(async (id) => {
      try {
        return [id, await resolveAuthorForPbriId(id)] as const
      } catch {
        const email = `${id}@pi.ac.th`
        return [
          id,
          { studentId: id, displayName: id, email },
        ] as const
      }
    })
  )
  return new Map(entries)
}
