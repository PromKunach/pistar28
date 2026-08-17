import { supabase } from "@/lib/supabaseClient"
import { COMPRESS_MIME, compressImageFile } from "@/lib/compressImage"
import {
  formatFeedPostDateTime,
  formatFeedPostTime,
  isFeedPostEmpty,
} from "@/lib/feedPostFormat"
import type { CurrentUser } from "@/lib/userProfile"

export { formatFeedPostDateTime, formatFeedPostTime, isFeedPostEmpty }

export const MAX_FEED_IMAGES = 10
export const FEED_PAGE_SIZE = 20

export type FeedPostRecord = {
  id: string
  author_pbri_id: string
  body: string
  created_at: string
  updated_at: string
}

export type FeedPostImageRecord = {
  id: string
  post_id: string
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
  sort_order: number
  created_at: string
}

export type FeedPostWithImages = FeedPostRecord & {
  images: FeedPostImageRecord[]
}

export type FeedImageUpload = {
  blob: Blob
  mimeType: string
  sizeBytes: number
}

export type CreateFeedPostInput = {
  body: string
  imageFiles: File[]
  author: CurrentUser
}

export type UpdateFeedPostInput = {
  body: string
  newImageFiles: File[]
  keepImageIds: string[]
  author: CurrentUser
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

export function feedPostMutationErrorMessage(error: unknown) {
  if (isPostgrestSingleRowError(error)) {
    return "บันทึกไม่สำเร็จ — คุณไม่มีสิทธิ์แก้ไขโพสต์นี้ หรือโพสต์ถูกลบแล้ว"
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: string }).message)
    if (message.includes("feed_posts") && message.includes("does not exist")) {
      return "ไม่พบตาราง feed_posts กรุณารัน supabase/feed_posts.sql ก่อน"
    }
    if (message.includes("row-level security") || message.includes("permission denied")) {
      return "ไม่มีสิทธิ์บันทึก ตรวจสอบนโยบาย RLS ใน Supabase"
    }
    if (message.includes("Bucket not found") || message.includes("storage")) {
      return "อัปโหลดรูปไม่สำเร็จ ตรวจสอบ bucket images และนโยบาย storage"
    }
    return message
  }

  return "บันทึกโพสต์ไม่ได้ กรุณาลองใหม่อีกครั้ง"
}

export function getFeedPostImageUrl(storagePath: string) {
  const { data } = supabase.storage.from("images").getPublicUrl(storagePath)
  return data.publicUrl
}

function normalizeImages(rows: unknown): FeedPostImageRecord[] {
  if (!Array.isArray(rows)) return []
  return rows
    .map((row) => {
      if (!row || typeof row !== "object") return null
      const record = row as Record<string, unknown>
      return {
        id: String(record.id),
        post_id: String(record.post_id),
        storage_path: String(record.storage_path),
        mime_type: record.mime_type ? String(record.mime_type) : null,
        size_bytes:
          typeof record.size_bytes === "number" ? record.size_bytes : null,
        sort_order: Number(record.sort_order) || 0,
        created_at: String(record.created_at),
      } satisfies FeedPostImageRecord
    })
    .filter((row): row is FeedPostImageRecord => Boolean(row))
    .sort((a, b) => a.sort_order - b.sort_order)
}

function normalizePost(row: Record<string, unknown>): FeedPostWithImages {
  return {
    id: String(row.id),
    author_pbri_id: String(row.author_pbri_id),
    body: String(row.body ?? ""),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    images: normalizeImages(row.feed_post_images),
  }
}

async function compressFiles(files: File[]): Promise<FeedImageUpload[]> {
  const uploads: FeedImageUpload[] = []
  for (const file of files) {
    const blob = await compressImageFile(file)
    uploads.push({
      blob,
      mimeType: COMPRESS_MIME,
      sizeBytes: blob.size,
    })
  }
  return uploads
}

function buildStoragePath(authorId: string, postId: string) {
  return `images/feed/${authorId}/${postId}/${crypto.randomUUID()}.webp`
}

async function uploadFeedImages(
  authorId: string,
  postId: string,
  uploads: FeedImageUpload[],
  startOrder: number
) {
  const rows: FeedPostImageRecord[] = []

  for (const [index, upload] of uploads.entries()) {
    const storagePath = buildStoragePath(authorId, postId)
    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(storagePath, upload.blob, {
        contentType: upload.mimeType,
        upsert: false,
      })
    if (uploadError) throw uploadError

    const { data, error } = await supabase
      .from("feed_post_images")
      .insert({
        post_id: postId,
        storage_path: storagePath,
        mime_type: upload.mimeType,
        size_bytes: upload.sizeBytes,
        sort_order: startOrder + index,
      })
      .select("*")
      .single()

    if (error) {
      await supabase.storage.from("images").remove([storagePath])
      throw error
    }

    rows.push(data as FeedPostImageRecord)
  }

  return rows
}

async function removeFeedImages(images: FeedPostImageRecord[]) {
  if (images.length === 0) return
  const paths = images.map((image) => image.storage_path)
  await supabase.storage.from("images").remove(paths)
  const { error } = await supabase
    .from("feed_post_images")
    .delete()
    .in(
      "id",
      images.map((image) => image.id)
    )
  if (error) throw error
}

export async function fetchFeedPosts({
  cursor,
  limit = FEED_PAGE_SIZE,
}: {
  cursor?: string | null
  limit?: number
} = {}): Promise<{ posts: FeedPostWithImages[]; nextCursor: string | null }> {
  let query = supabase
    .from("feed_posts")
    .select("*, feed_post_images(*)")
    .order("created_at", { ascending: false })
    .limit(limit + 1)

  if (cursor) {
    query = query.lt("created_at", cursor)
  }

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as Array<Record<string, unknown>>
  const hasMore = rows.length > limit
  const slice = hasMore ? rows.slice(0, limit) : rows
  const posts = slice.map(normalizePost)
  const nextCursor = hasMore ? posts[posts.length - 1]?.created_at ?? null : null

  return { posts, nextCursor }
}

export async function createFeedPost(
  input: CreateFeedPostInput
): Promise<FeedPostWithImages> {
  const body = input.body.trim()
  const files = input.imageFiles.slice(0, MAX_FEED_IMAGES)
  if (isFeedPostEmpty(body, files.length)) {
    throw new Error("กรุณาใส่ข้อความหรือรูปภาพ")
  }

  const { data: post, error } = await supabase
    .from("feed_posts")
    .insert({
      author_pbri_id: input.author.studentId,
      body,
    })
    .select("*")
    .single()

  if (error) throw error

  const postId = (post as FeedPostRecord).id
  let images: FeedPostImageRecord[] = []

  try {
    if (files.length > 0) {
      const uploads = await compressFiles(files)
      images = await uploadFeedImages(input.author.studentId, postId, uploads, 0)
    }
  } catch (uploadError) {
    await supabase.from("feed_posts").delete().eq("id", postId)
    throw uploadError
  }

  return {
    ...(post as FeedPostRecord),
    images,
  }
}

export async function updateFeedPost(
  id: string,
  input: UpdateFeedPostInput
): Promise<FeedPostWithImages> {
  const body = input.body.trim()
  const newFiles = input.newImageFiles.slice(
    0,
    Math.max(0, MAX_FEED_IMAGES - input.keepImageIds.length)
  )

  if (isFeedPostEmpty(body, input.keepImageIds.length + newFiles.length)) {
    throw new Error("กรุณาใส่ข้อความหรือรูปภาพ")
  }

  const { data: existing, error: fetchError } = await supabase
    .from("feed_posts")
    .select("*, feed_post_images(*)")
    .eq("id", id)
    .single()

  if (fetchError) throw fetchError
  const current = normalizePost(existing as Record<string, unknown>)

  const keepSet = new Set(input.keepImageIds)
  const removed = current.images.filter((image) => !keepSet.has(image.id))
  const kept = current.images
    .filter((image) => keepSet.has(image.id))
    .sort((a, b) => a.sort_order - b.sort_order)

  const { data: updatedPost, error: updateError } = await supabase
    .from("feed_posts")
    .update({
      body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single()

  if (updateError) throw updateError

  try {
    await removeFeedImages(removed)

    for (const [index, image] of kept.entries()) {
      if (image.sort_order !== index) {
        await supabase
          .from("feed_post_images")
          .update({ sort_order: index })
          .eq("id", image.id)
      }
    }

    const newImages =
      newFiles.length > 0
        ? await uploadFeedImages(
            input.author.studentId,
            id,
            await compressFiles(newFiles),
            kept.length
          )
        : []

    return {
      ...(updatedPost as FeedPostRecord),
      images: [
        ...kept.map((image, index) => ({ ...image, sort_order: index })),
        ...newImages,
      ],
    }
  } catch (error) {
    throw error
  }
}

export async function deleteFeedPost(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("feed_posts")
    .select("*, feed_post_images(*)")
    .eq("id", id)
    .single()

  if (error) throw error
  const post = normalizePost(data as Record<string, unknown>)

  const { error: deleteError } = await supabase.from("feed_posts").delete().eq("id", id)
  if (deleteError) throw deleteError

  if (post.images.length > 0) {
    await supabase.storage
      .from("images")
      .remove(post.images.map((image) => image.storage_path))
  }
}
