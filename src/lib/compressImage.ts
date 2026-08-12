export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
export const COMPRESS_MAX_WIDTH = 1200
export const COMPRESS_QUALITY = 0.85
export const COMPRESS_MIME = "image/webp"

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function compressionSavingsPercent(originalBytes: number, compressedBytes: number) {
  if (originalBytes <= 0 || compressedBytes >= originalBytes) return 0
  return Math.round((1 - compressedBytes / originalBytes) * 100)
}

export async function compressImageFile(
  file: File,
  {
    maxWidth = COMPRESS_MAX_WIDTH,
    quality = COMPRESS_QUALITY,
    mimeType = COMPRESS_MIME,
  }: {
    maxWidth?: number
    quality?: number
    mimeType?: string
  } = {}
): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext("2d")
  if (!ctx) {
    bitmap.close()
    throw new Error("Could not prepare image compression")
  }

  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result ? resolve(result) : reject(new Error("Compression failed")),
      mimeType,
      quality
    )
  })

  return blob
}
