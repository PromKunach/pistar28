"use client"

import { useEffect, useRef, useState } from "react"
import { ImagePlus, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  MAX_UPLOAD_BYTES,
  compressImageFile,
  formatFileSize,
} from "@/lib/compressImage"
import {
  MAX_FEED_IMAGES,
  createFeedPost,
  feedPostMutationErrorMessage,
  getFeedPostImageUrl,
  isFeedPostEmpty,
  updateFeedPost,
  type FeedPostWithImages,
} from "@/lib/feedPosts"
import type { CurrentUser } from "@/lib/userProfile"
import { cn } from "@/lib/utils"

type ComposerMode = "create" | "edit"

type ExistingImage = {
  id: string
  url: string
}

type PendingImage = {
  id: string
  file: File
  previewUrl: string
}

export function FeedComposerDialog({
  open,
  mode,
  post,
  author,
  onClose,
  onSaved,
}: {
  open: boolean
  mode: ComposerMode
  post: FeedPostWithImages | null
  author: CurrentUser
  onClose: () => void
  onSaved: (post: FeedPostWithImages) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [body, setBody] = useState("")
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([])
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    setBody(post?.body ?? "")
    setExistingImages(
      (post?.images ?? []).map((image) => ({
        id: image.id,
        url: getFeedPostImageUrl(image.storage_path),
      }))
    )
    setPendingImages([])
    setError(null)
    setIsSubmitting(false)
  }, [open, post])

  useEffect(() => {
    return () => {
      for (const image of pendingImages) {
        URL.revokeObjectURL(image.previewUrl)
      }
    }
  }, [pendingImages])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    document.addEventListener("keydown", handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  const totalImages = existingImages.length + pendingImages.length
  const canAddMore = totalImages < MAX_FEED_IMAGES

  const removePending = (id: string) => {
    setPendingImages((current) => {
      const target = current.find((image) => image.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return current.filter((image) => image.id !== id)
    })
  }

  const handlePickFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setError(null)

    const remaining = MAX_FEED_IMAGES - totalImages
    const picked = Array.from(files).slice(0, remaining)

    for (const file of picked) {
      if (file.size > MAX_UPLOAD_BYTES) {
        setError(`รูปใหญ่เกินไป สูงสุด ${formatFileSize(MAX_UPLOAD_BYTES)}`)
        continue
      }
      try {
        await compressImageFile(file)
      } catch {
        setError("ไม่สามารถอ่านไฟล์รูปนี้ได้")
        continue
      }

      setPendingImages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
        },
      ])
    }
  }

  const handleSubmit = async () => {
    if (isFeedPostEmpty(body, totalImages)) {
      setError("กรุณาใส่ข้อความหรือรูปภาพ")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const saved =
        mode === "create"
          ? await createFeedPost({
              body,
              imageFiles: pendingImages.map((image) => image.file),
              author,
            })
          : await updateFeedPost(post!.id, {
              body,
              newImageFiles: pendingImages.map((image) => image.file),
              keepImageIds: existingImages.map((image) => image.id),
              author,
            })

      onSaved(saved)
      onClose()
    } catch (submitError) {
      setError(feedPostMutationErrorMessage(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="ปิดหน้าต่าง"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.8 }}
            className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {mode === "create" ? "สร้างโพสต์" : "แก้ไขโพสต์"}
              </h2>
              <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 overflow-y-auto p-5 no-scrollbar">
              <div className="space-y-2">
                <Label htmlFor="feed-post-body">ข้อความ</Label>
                <textarea
                  id="feed-post-body"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={5}
                  placeholder="คุณกำลังคิดอะไรอยู่?"
                  className={cn(
                    "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm",
                    "text-neutral-900 outline-none focus:border-neutral-400",
                    "dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                  )}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>รูปภาพ ({totalImages}/{MAX_FEED_IMAGES})</Label>
                  {canAddMore ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus className="me-2 h-4 w-4" />
                      เพิ่มรูป
                    </Button>
                  ) : null}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    void handlePickFiles(event.target.files)
                    event.target.value = ""
                  }}
                />
                {totalImages > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {existingImages.map((image) => (
                      <div
                        key={image.id}
                        className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800"
                      >
                        <Image src={image.url} alt="" fill className="object-cover" sizes="120px" />
                        <button
                          type="button"
                          aria-label="ลบรูป"
                          onClick={() =>
                            setExistingImages((current) =>
                              current.filter((item) => item.id !== image.id)
                            )
                          }
                          className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {pendingImages.map((image) => (
                      <div
                        key={image.id}
                        className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800"
                      >
                        <Image
                          src={image.previewUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="120px"
                          unoptimized
                        />
                        <button
                          type="button"
                          aria-label="ลบรูป"
                          onClick={() => removePending(image.id)}
                          className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    PNG, JPG หรือ WebP · สูงสุด {formatFileSize(MAX_UPLOAD_BYTES)} ต่อรูป
                  </p>
                )}
              </div>

              {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
            </div>

            <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                ยกเลิก
              </Button>
              <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
                {isSubmitting
                  ? "กำลังบันทึก..."
                  : mode === "create"
                    ? "โพสต์"
                    : "บันทึก"}
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
