export function isFeedPostEmpty(body: string, imageCount: number) {
  return body.trim().length === 0 && imageCount <= 0
}

export function formatFeedPostTime(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHour = Math.floor(diffMs / 3_600_000)
  const diffDay = Math.floor(diffMs / 86_400_000)

  if (diffMin < 1) return "เมื่อสักครู่"
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`
  if (diffHour < 24) return `${diffHour} ชม.ที่แล้ว`
  if (diffDay === 1) return "เมื่อวาน"
  if (diffDay < 7) return `${diffDay} วันที่แล้ว`

  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  })
}

export function formatFeedPostDateTime(iso: string) {
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
