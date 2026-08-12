import { supabase } from "@/lib/supabaseClient"
import { resolveUserProfile, type CurrentUser } from "@/lib/userProfile"

export type ImageFocus = {
  x: number
  y: number
  zoom: number
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
      image_focus: input.imageFocus,
      image_storage_path: storagePath,
      image_file_name: input.imageName,
      image_mime_type: input.imageBlob ? "image/webp" : null,
      image_size_bytes: input.imageMeta?.compressedSize ?? null,
      image_original_size_bytes: input.imageMeta?.originalSize ?? null,
    })
    .select()
    .single()

  if (error) {
    if (storagePath) {
      await supabase.storage.from("images").remove([storagePath])
    }
    throw error
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

  const { data, error } = await supabase
    .from("announcements")
    .update({
      name: input.name,
      description: input.description,
      icon_id: input.iconId,
      text_color: input.textColor,
      card_color: input.cardColor,
      image_focus: input.imageFocus,
      ...(imageChanged
        ? {
            image_storage_path: nextStoragePath,
            image_file_name: input.imageBlob ? input.imageName : null,
            image_mime_type: input.imageBlob ? "image/webp" : null,
            image_size_bytes: input.imageMeta?.compressedSize ?? null,
            image_original_size_bytes: input.imageMeta?.originalSize ?? null,
          }
        : null),
    })
    .eq("id", input.id)
    .select()
    .single()

  if (error) {
    if (nextStoragePath) {
      await supabase.storage.from("images").remove([nextStoragePath])
    }
    throw error
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
