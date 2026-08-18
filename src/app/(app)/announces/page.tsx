"use client"

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  BellIcon,
  CalendarIcon,
  ChevronDownIcon,
  Cross2Icon,
  FileTextIcon,
  GlobeIcon,
  InputIcon,
  PlusIcon,
  RocketIcon,
  SpeakerLoudIcon,
  StarIcon,
} from "@radix-ui/react-icons"

import { AnimatePresence, motion } from "motion/react"
import { ImagePlus, Loader2, Move, Trash2, Upload, X } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncement,
  fetchAnnouncements,
  getAnnouncementImageUrl,
  normalizeImageFocus,
  announcementMutationErrorMessage,
  resolveAuthorsForRecords,
  updateAnnouncement,
  type AnnouncementRecord,
} from "@/lib/announcements"
import {
  MAX_UPLOAD_BYTES,
  compressImageFile,
  compressionSavingsPercent,
  formatFileSize,
} from "@/lib/compressImage"
import { type CurrentUser, useCurrentUser } from "@/lib/userProfile"
import { BentoCard, BentoGrid, BentoGridSkeleton } from "@/components/ui/bento-grid"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const MAX_COLS = 4
const TILE_COL_SPAN = 1
const TILE_ROW_SPAN = 1

type GridPlacement = {
  colStart: number
  colEnd: number
  rowStart: number
  rowEnd: number
}

type BentoFeature = {
  id: string
  Icon: ElementType
  name: string
  description: string
  href: string
  cta: string
  background: ReactNode
  placement: GridPlacement
  author: CurrentUser
  textColor: string
  cardColor: string
}

const ICON_OPTIONS: { id: string; label: string; Icon: ElementType }[] = [
  { id: "file", label: "เอกสาร", Icon: FileTextIcon },
  { id: "input", label: "ข้อความ", Icon: InputIcon },
  { id: "globe", label: "โลก", Icon: GlobeIcon },
  { id: "calendar", label: "ปฏิทิน", Icon: CalendarIcon },
  { id: "bell", label: "กระดิ่ง", Icon: BellIcon },
  { id: "speaker", label: "ประกาศ", Icon: SpeakerLoudIcon },
  { id: "rocket", label: "จรวด", Icon: RocketIcon },
  { id: "star", label: "ดาว", Icon: StarIcon },
]

const DEFAULT_TEXT_COLOR = "#404040"
const DEFAULT_CARD_COLOR = "#ffffff"

const TEXT_PRESETS = [
  "#404040",
  "#0f172a",
  "#ffffff",
  "#c2410c",
  "#1d4ed8",
  "#15803d",
  "#7e22ce",
  "#be123c",
]

const CARD_PRESETS = [
  "#ffffff",
  "#f8fafc",
  "#0f172a",
  "#fff7ed",
  "#eff6ff",
  "#f0fdf4",
  "#faf5ff",
  "#fff1f2",
]

const THEME_PAIRS: { label: string; textColor: string; cardColor: string }[] = [
  { label: "คลาสสิก", textColor: "#404040", cardColor: "#ffffff" },
  { label: "เที่ยงคืน", textColor: "#e2e8f0", cardColor: "#0f172a" },
  { label: "อรุณ", textColor: "#9a3412", cardColor: "#fff7ed" },
  { label: "มหาสมุทร", textColor: "#1e40af", cardColor: "#eff6ff" },
  { label: "ป่า", textColor: "#166534", cardColor: "#f0fdf4" },
  { label: "บาน", textColor: "#9f1239", cardColor: "#fff1f2" },
]

type ColorTarget = "text" | "card"

const COLOR_TARGET_LABELS: Record<ColorTarget, string> = {
  text: "ข้อความ",
  card: "การ์ด",
}

function formatAnnounceCreatedAt(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
  }).format(new Date(value))
}

function normalizeHex(value: string): string | null {
  const trimmed = value.trim()
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`
  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) return withHash.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
    const [, r, g, b] = withHash
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return null
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex) ?? "#000000"
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  }
}

function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const channel = (value: number) => {
    const srgb = value / 255
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrastRatio(foreground: string, background: string) {
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background))
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background))
  return (light + 0.05) / (dark + 0.05)
}

function readableTextColor(background: string) {
  return contrastRatio("#ffffff", background) >= contrastRatio("#111827", background)
    ? "#ffffff"
    : "#111827"
}

function hexToHsv(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min

  let hue = 0
  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6
    else if (max === green) hue = (blue - red) / delta + 2
    else hue = (red - green) / delta + 4
    hue *= 60
    if (hue < 0) hue += 360
  }

  return { h: hue, s: max === 0 ? 0 : delta / max, v: max }
}

function hsvToHex(h: number, s: number, v: number) {
  const chroma = v * s
  const second = chroma * (1 - Math.abs(((h / 60) % 2) - 1))
  const match = v - chroma

  let rgb: [number, number, number]
  if (h < 60) rgb = [chroma, second, 0]
  else if (h < 120) rgb = [second, chroma, 0]
  else if (h < 180) rgb = [0, chroma, second]
  else if (h < 240) rgb = [0, second, chroma]
  else if (h < 300) rgb = [second, 0, chroma]
  else rgb = [chroma, 0, second]

  const channel = (value: number) =>
    Math.round((value + match) * 255)
      .toString(16)
      .padStart(2, "0")

  return `#${channel(rgb[0])}${channel(rgb[1])}${channel(rgb[2])}`
}

const initialFeatures: BentoFeature[] = []

function buildOccupancy(items: BentoFeature[]) {
  const grid: boolean[][] = []

  const mark = (row: number, col: number) => {
    while (grid.length < row) {
      grid.push(Array(MAX_COLS).fill(false))
    }
    grid[row - 1][col - 1] = true
  }

  for (const item of items) {
    const { colStart, colEnd, rowStart, rowEnd } = item.placement
    for (let row = rowStart; row < rowEnd; row++) {
      for (let col = colStart; col < colEnd; col++) {
        mark(row, col)
      }
    }
  }

  return grid
}

function canPlace(
  grid: boolean[][],
  row: number,
  col: number,
  colSpan: number,
  rowSpan: number
) {
  if (col + colSpan - 1 > MAX_COLS) return false

  for (let r = row; r < row + rowSpan; r++) {
    for (let c = col; c < col + colSpan; c++) {
      if (grid[r - 1]?.[c - 1]) return false
    }
  }

  return true
}

function placementAt(
  row: number,
  col: number,
  colSpan: number,
  rowSpan: number
): GridPlacement {
  return {
    colStart: col,
    colEnd: col + colSpan,
    rowStart: row,
    rowEnd: row + rowSpan,
  }
}

function shiftItemsDown(items: BentoFeature[], rows: number): BentoFeature[] {
  return items.map((item) => ({
    ...item,
    placement: {
      ...item.placement,
      rowStart: item.placement.rowStart + rows,
      rowEnd: item.placement.rowEnd + rows,
    },
  }))
}

function placeAtTop(items: BentoFeature[]) {
  const grid = buildOccupancy(items)

  for (let col = 1; col <= MAX_COLS; col++) {
    if (canPlace(grid, 1, col, TILE_COL_SPAN, TILE_ROW_SPAN)) {
      return {
        items,
        placement: placementAt(1, col, TILE_COL_SPAN, TILE_ROW_SPAN),
      }
    }
  }

  const shiftedItems = shiftItemsDown(items, TILE_ROW_SPAN)

  for (let col = 1; col <= MAX_COLS; col++) {
    if (canPlace(buildOccupancy(shiftedItems), 1, col, TILE_COL_SPAN, TILE_ROW_SPAN)) {
      return {
        items: shiftedItems,
        placement: placementAt(1, col, TILE_COL_SPAN, TILE_ROW_SPAN),
      }
    }
  }

  return {
    items: shiftedItems,
    placement: placementAt(1, 1, TILE_COL_SPAN, TILE_ROW_SPAN),
  }
}

type ImageFocus = {
  x: number
  y: number
  zoom: number
}

type NoteDraft = {
  name: string
  description: string
  iconId: string
  textColor: string
  cardColor: string
  imageUrl: string | null
  imageBlob: Blob | null
  imageName: string | null
  imageMeta: ImageUploadMeta | null
  imageFocus: ImageFocus
  imageRemoved: boolean
  author: CurrentUser
}

type ImageUploadMeta = {
  originalSize: number
  compressedSize: number
}

function recordsToFeatures(
  records: AnnouncementRecord[],
  authors: Map<string, CurrentUser>
): BentoFeature[] {
  let placed: BentoFeature[] = []
  const features: BentoFeature[] = []

  for (const record of records) {
    const { items, placement } = placeAtTop(placed)
    const Icon =
      ICON_OPTIONS.find((option) => option.id === record.icon_id)?.Icon ??
      ICON_OPTIONS[0].Icon
    const imageUrl = getAnnouncementImageUrl(record.image_storage_path)
    const author = authors.get(record.author_pbri_id) ?? {
      studentId: record.author_pbri_id,
      displayName: record.author_pbri_id,
      email: `${record.author_pbri_id}@pi.ac.th`,
    }

    const feature: BentoFeature = {
      id: record.id,
      Icon,
      name: record.name,
      description: record.description,
      href: `/announces/${record.id}`,
      cta: formatAnnounceCreatedAt(record.created_at),
      background: tileBackground(imageUrl, record.image_focus, record.card_color),
      placement,
      author,
      textColor: record.text_color,
      cardColor: record.card_color,
    }

    features.push(feature)
    placed = [feature, ...items]
  }

  return features
}

function recordToFeature(
  record: AnnouncementRecord,
  author: CurrentUser,
  placement: GridPlacement
): BentoFeature {
  const Icon =
    ICON_OPTIONS.find((option) => option.id === record.icon_id)?.Icon ??
    ICON_OPTIONS[0].Icon
  const imageUrl = getAnnouncementImageUrl(record.image_storage_path)

  return {
    id: record.id,
    Icon,
    name: record.name,
    description: record.description,
    href: `/announces/${record.id}`,
    cta: formatAnnounceCreatedAt(record.created_at),
    background: tileBackground(imageUrl, record.image_focus, record.card_color),
    placement,
    author,
    textColor: record.text_color,
    cardColor: record.card_color,
  }
}

function announceLoadErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: string }).message)
    if (message.includes("announcements") && message.includes("does not exist")) {
      return "ไม่พบตาราง announcements กรุณารัน supabase/announcements.sql ก่อน"
    }
    if (message.includes("row-level security") || message.includes("permission denied")) {
      return "โหลดโน้ตประกาศไม่ได้ กรุณารันนโยบายใน supabase/announcements.sql ที่อัปเดตแล้ว"
    }
    return message
  }
  return "โหลดโน้ตประกาศไม่ได้ กรุณาลองใหม่อีกครั้ง"
}

function announcePostErrorMessage(error: unknown) {
  return announcementMutationErrorMessage(error)
}

function compressedFileName(name: string) {
  const base = name.replace(/\.[^.]+$/, "") || "image"
  return `${base}.webp`
}

function ImageSizeBadge({ meta }: { meta: ImageUploadMeta }) {
  const saved = meta.originalSize - meta.compressedSize
  const savedPercent = compressionSavingsPercent(
    meta.originalSize,
    meta.compressedSize
  )

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
      <span>
        <span className="font-medium text-foreground dark:text-neutral-300">
          {formatFileSize(meta.compressedSize)}
        </span>
        {" · "}
        WebP
      </span>
      {saved > 0 && (
        <span className="text-green-700 dark:text-green-400">
          {formatFileSize(meta.originalSize)} → ลด {formatFileSize(saved)} (
          {savedPercent}%)
        </span>
      )}
    </div>
  )
}

function AuthorProfile({
  author,
  subtitle = "โพสต์ในนาม",
}: {
  author: CurrentUser
  subtitle?: string
}) {
  return (
    <div className="flex max-w-[180px] items-center gap-2 sm:max-w-[220px]">
      <div className="min-w-0 text-right">
        <p className="truncate text-sm font-medium text-foreground">
          {author.displayName}
        </p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {author.avatarUrl ? (
        <img
          src={author.avatarUrl}
          alt=""
          className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-neutral-700"
        />
      ) : (
        <div className="h-9 w-9 shrink-0 rounded-full bg-muted" />
      )}
    </div>
  )
}

const DEFAULT_IMAGE_FOCUS: ImageFocus = { x: 50, y: 50, zoom: 1 }

function tileImageFade(toColor: string) {
  return `linear-gradient(to bottom, transparent 0%, color-mix(in oklch, ${toColor} 12%, transparent) 28%, color-mix(in oklch, ${toColor} 48%, transparent) 52%, color-mix(in oklch, ${toColor} 78%, transparent) 76%, ${toColor} 100%)`
}

function TileImageFade({
  className,
  toColor = "var(--background)",
}: {
  className?: string
  toColor?: string
}) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-x-0", className)}
      style={{ background: tileImageFade(toColor) }}
    />
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function tileBackground(
  imageUrl: string | null,
  focus: ImageFocus = DEFAULT_IMAGE_FOCUS,
  cardColor = DEFAULT_CARD_COLOR
) {
  if (!imageUrl) {
    return (
      <div
        className="absolute -top-16 -right-16 h-56 w-56 rounded-full opacity-40 blur-3xl"
        style={{ backgroundColor: cardColor }}
      />
    )
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[66%] overflow-hidden">
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover will-change-transform"
          style={{
            objectPosition: `${focus.x}% ${focus.y}%`,
            transform: `scale(${focus.zoom})`,
            transformOrigin: `${focus.x}% ${focus.y}%`,
          }}
        />
      </div>
      <TileImageFade className="top-[42%] h-[24%]" toColor={cardColor} />
    </>
  )
}

function SelectorDropdown({
  label,
  valueLabel,
  valuePreview,
  open,
  onToggle,
  onClose,
  menuRef,
  children,
}: {
  label: string
  valueLabel: string
  valuePreview: ReactNode
  open: boolean
  onToggle: () => void
  onClose: () => void
  menuRef: RefObject<HTMLDivElement | null>
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose()
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [open, onClose, menuRef])

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={onToggle}
          className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-gray-50 px-3 text-sm text-foreground transition-colors hover:bg-muted dark:border-neutral-700 dark:bg-zinc-800 dark:text-neutral-200 dark:hover:bg-zinc-700"
        >
          <span className="flex min-w-0 items-center gap-2">
            {valuePreview}
            <span className="truncate">{valueLabel}</span>
          </span>
          <ChevronDownIcon
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.ul
              role="listbox"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-background p-1 shadow-lg dark:border-neutral-700"
            >
              {children}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function useDragSurface(onMove: (clientX: number, clientY: number) => void) {
  const ref = useRef<HTMLDivElement>(null)
  const activePointer = useRef<number | null>(null)

  return {
    ref,
    handlers: {
      onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
        event.preventDefault()
        activePointer.current = event.pointerId
        ref.current?.setPointerCapture(event.pointerId)
        onMove(event.clientX, event.clientY)
      },
      onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
        if (activePointer.current !== event.pointerId) return
        onMove(event.clientX, event.clientY)
      },
      onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => {
        if (activePointer.current !== event.pointerId) return
        activePointer.current = null
        ref.current?.releasePointerCapture(event.pointerId)
      },
      onPointerCancel: () => {
        activePointer.current = null
      },
    },
  }
}

function SpectrumPicker({
  color,
  onChange,
}: {
  color: string
  onChange: (hex: string) => void
}) {
  const { h, s, v } = hexToHsv(color)
  const [hue, setHue] = useState(h)

  // A grey or black swatch has no meaningful hue, so keep the last real one.
  useEffect(() => {
    const next = hexToHsv(color)
    if (next.s > 0.01 && next.v > 0.01) setHue(next.h)
  }, [color])

  const area = useDragSurface((clientX, clientY) => {
    const rect = area.ref.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return
    const nextS = clamp((clientX - rect.left) / rect.width, 0, 1)
    const nextV = 1 - clamp((clientY - rect.top) / rect.height, 0, 1)
    onChange(hsvToHex(hue, nextS, nextV))
  })

  const hueBar = useDragSurface((clientX) => {
    const rect = hueBar.ref.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const nextHue = clamp((clientX - rect.left) / rect.width, 0, 1) * 360
    setHue(nextHue)
    onChange(hsvToHex(nextHue, s || 1, v || 1))
  })

  return (
    <div className="space-y-2">
      <div
        ref={area.ref}
        {...area.handlers}
        role="slider"
        tabIndex={0}
        aria-label="ความอิ่มตัวและความสว่าง"
        aria-valuetext={`ความอิ่มตัว ${Math.round(s * 100)}% ความสว่าง ${Math.round(v * 100)}%`}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 0.1 : 0.02
          if (event.key === "ArrowRight") onChange(hsvToHex(hue, clamp(s + step, 0, 1), v))
          else if (event.key === "ArrowLeft") onChange(hsvToHex(hue, clamp(s - step, 0, 1), v))
          else if (event.key === "ArrowUp") onChange(hsvToHex(hue, s, clamp(v + step, 0, 1)))
          else if (event.key === "ArrowDown") onChange(hsvToHex(hue, s, clamp(v - step, 0, 1)))
          else return
          event.preventDefault()
        }}
        className="relative h-28 w-full cursor-crosshair touch-none rounded-md border border-border outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-neutral-700"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hsvToHex(hue, 1, 1)})`,
        }}
      >
        <span
          className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.35)]"
          style={{
            left: `${s * 100}%`,
            top: `${(1 - v) * 100}%`,
            backgroundColor: color,
          }}
        />
      </div>

      <div
        ref={hueBar.ref}
        {...hueBar.handlers}
        role="slider"
        tabIndex={0}
        aria-label="สี (Hue)"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hue)}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 15 : 3
          let nextHue = hue
          if (event.key === "ArrowRight") nextHue = (hue + step) % 360
          else if (event.key === "ArrowLeft") nextHue = (hue - step + 360) % 360
          else return
          event.preventDefault()
          setHue(nextHue)
          onChange(hsvToHex(nextHue, s || 1, v || 1))
        }}
        className="relative h-3.5 w-full cursor-pointer touch-none rounded-full border border-border outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-neutral-700"
        style={{
          background:
            "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
        }}
      >
        <span
          className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.35)]"
          style={{
            left: `${(hue / 360) * 100}%`,
            backgroundColor: hsvToHex(hue, 1, 1),
          }}
        />
      </div>
    </div>
  )
}

function ColorTargetPicker({
  textColor,
  cardColor,
  target,
  onTargetChange,
  onTextColorChange,
  onCardColorChange,
}: {
  textColor: string
  cardColor: string
  target: ColorTarget
  onTargetChange: (target: ColorTarget) => void
  onTextColorChange: (color: string) => void
  onCardColorChange: (color: string) => void
}) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const activeColor = target === "text" ? textColor : cardColor
  const setActiveColor = target === "text" ? onTextColorChange : onCardColorChange
  const presets = target === "text" ? TEXT_PRESETS : CARD_PRESETS

  const [hexDraft, setHexDraft] = useState(activeColor)

  useEffect(() => {
    setHexDraft(activeColor)
  }, [activeColor])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown, true)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown, true)
    }
  }, [open])

  const ratio = contrastRatio(textColor, cardColor)
  const readable = ratio >= 4.5
  const matchedTheme = THEME_PAIRS.find(
    (pair) =>
      pair.textColor === textColor.toLowerCase() &&
      pair.cardColor === cardColor.toLowerCase()
  )

  return (
    <div className="space-y-2">
      <Label>สี</Label>
      <div ref={panelRef} className="relative">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-border bg-gray-50 px-3 text-sm text-foreground transition-colors hover:bg-muted dark:border-neutral-700 dark:bg-zinc-800 dark:text-neutral-200 dark:hover:bg-zinc-700"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1 ring-neutral-300 dark:ring-neutral-600"
              style={{ backgroundColor: cardColor, color: textColor }}
            >
              A
            </span>
            <span className="truncate">{matchedTheme?.label ?? "กำหนดเอง"}</span>
          </span>
          <ChevronDownIcon
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              role="dialog"
              aria-label="ตั้งค่าสี"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-30 mt-1 w-[17rem] space-y-3 rounded-lg border border-border bg-background p-3 shadow-lg dark:border-neutral-700"
            >
              <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1 dark:bg-neutral-900">
                {(["text", "card"] as ColorTarget[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onTargetChange(option)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                      target === option
                        ? "bg-background text-foreground shadow-sm dark:text-neutral-100"
                        : "text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-neutral-200"
                    )}
                  >
                    <span
                      className="h-3 w-3 rounded-full ring-1 ring-neutral-300 dark:ring-neutral-600"
                      style={{
                        backgroundColor: option === "text" ? textColor : cardColor,
                      }}
                    />
                    {COLOR_TARGET_LABELS[option]}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-8 gap-1.5">
                {presets.map((preset) => {
                  const isActive = activeColor.toLowerCase() === preset
                  return (
                    <button
                      key={preset}
                      type="button"
                      title={preset}
                      onClick={() => setActiveColor(preset)}
                      className={cn(
                        "aspect-square rounded-full border border-neutral-300 transition-transform hover:scale-110 dark:border-neutral-600",
                        isActive &&
                          "ring-2 ring-neutral-900 ring-offset-2 ring-offset-background dark:ring-neutral-100"
                      )}
                      style={{ backgroundColor: preset }}
                      aria-label={`ใช้ ${preset}`}
                    />
                  )
                })}
              </div>

              <SpectrumPicker color={activeColor} onChange={setActiveColor} />

              <div className="flex items-center gap-2">
                <span
                  className="h-9 w-9 shrink-0 rounded-md border border-neutral-300 dark:border-neutral-600"
                  style={{ backgroundColor: activeColor }}
                />
                <input
                  value={hexDraft}
                  onChange={(event) => {
                    setHexDraft(event.target.value)
                    const next = normalizeHex(event.target.value)
                    if (next) setActiveColor(next)
                  }}
                  onBlur={() => {
                    const next = normalizeHex(hexDraft)
                    if (next) setActiveColor(next)
                    else setHexDraft(activeColor)
                  }}
                  spellCheck={false}
                  className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 font-mono text-xs text-foreground uppercase outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-neutral-700 dark:text-neutral-200 dark:focus-visible:ring-neutral-600"
                  placeholder="#000000"
                  aria-label={`ค่าสี ${COLOR_TARGET_LABELS[target]}`}
                />
              </div>

              <div
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[11px]",
                  readable
                    ? "bg-muted text-muted-foreground dark:bg-neutral-900"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                )}
              >
                <span>
                  {readable ? "อ่านง่าย" : "คอนทราสต์ต่ำ"} · {ratio.toFixed(1)}:1
                </span>
                {!readable && (
                  <button
                    type="button"
                    onClick={() => onTextColorChange(readableTextColor(cardColor))}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    ปรับข้อความ
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground">ธีม</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {THEME_PAIRS.map((pair) => (
                    <button
                      key={pair.label}
                      type="button"
                      onClick={() => {
                        onTextColorChange(pair.textColor)
                        onCardColorChange(pair.cardColor)
                      }}
                      className={cn(
                        "rounded-md border px-2 py-1.5 text-[11px] font-medium transition-transform hover:scale-[1.03]",
                        matchedTheme?.label === pair.label
                          ? "border-neutral-900 dark:border-neutral-100"
                          : "border-border"
                      )}
                      style={{
                        backgroundColor: pair.cardColor,
                        color: pair.textColor,
                      }}
                    >
                      {pair.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-border pt-2 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => {
                    onTextColorChange(cardColor)
                    onCardColorChange(textColor)
                  }}
                  className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                >
                  สลับสี
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onTextColorChange(DEFAULT_TEXT_COLOR)
                    onCardColorChange(DEFAULT_CARD_COLOR)
                  }}
                  className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                >
                  รีเซ็ตทั้งคู่
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function ImageCropper({
  imageUrl,
  focus,
  onChange,
}: {
  imageUrl: string
  focus: ImageFocus
  onChange: (focus: ImageFocus) => void
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)

  const updateFromPointer = (clientX: number, clientY: number) => {
    const drag = dragRef.current
    const frame = frameRef.current
    if (!drag || !frame) return

    const rect = frame.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const sensitivity = 100 / focus.zoom
    const nextX = drag.originX - ((clientX - drag.startX) / rect.width) * sensitivity
    const nextY = drag.originY - ((clientY - drag.startY) / rect.height) * sensitivity

    onChange({
      ...focus,
      x: clamp(nextX, 0, 100),
      y: clamp(nextY, 0, 100),
    })
  }

  return (
    <div className="space-y-3">
      <div
        ref={frameRef}
        className="relative aspect-[16/10] cursor-grab touch-none overflow-hidden rounded-lg border border-border bg-muted active:cursor-grabbing dark:border-neutral-700 dark:bg-neutral-900"
        onPointerDown={(event) => {
          event.preventDefault()
          frameRef.current?.setPointerCapture(event.pointerId)
          dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originX: focus.x,
            originY: focus.y,
          }
        }}
        onPointerMove={(event) => {
          if (dragRef.current?.pointerId !== event.pointerId) return
          updateFromPointer(event.clientX, event.clientY)
        }}
        onPointerUp={(event) => {
          if (dragRef.current?.pointerId !== event.pointerId) return
          dragRef.current = null
          frameRef.current?.releasePointerCapture(event.pointerId)
        }}
        onPointerCancel={() => {
          dragRef.current = null
        }}
      >
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover select-none"
          style={{
            objectPosition: `${focus.x}% ${focus.y}%`,
            transform: `scale(${focus.zoom})`,
            transformOrigin: `${focus.x}% ${focus.y}%`,
          }}
        />
        <TileImageFade className="bottom-0 h-[42%]" />
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center p-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-[11px] text-white backdrop-blur-sm">
            <Move className="h-3 w-3" />
            ลากเพื่อปรับตำแหน่ง
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="image-zoom" className="text-xs text-muted-foreground">
            ซูม / ครอบตัด
          </Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {focus.zoom.toFixed(1)}x
          </span>
        </div>
        <input
          id="image-zoom"
          type="range"
          min={1}
          max={2.5}
          step={0.05}
          value={focus.zoom}
          onChange={(event) =>
            onChange({ ...focus, zoom: Number(event.target.value) })
          }
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-neutral-200 accent-neutral-800 dark:bg-neutral-700 dark:accent-neutral-200"
        />
        <button
          type="button"
          onClick={() => onChange(DEFAULT_IMAGE_FOCUS)}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          รีเซ็ตตำแหน่ง
        </button>
      </div>
    </div>
  )
}

function AddNoteDialog({
  open,
  onClose,
  onSubmit,
  onDelete,
  editRecord,
  author,
  authorReady,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (draft: NoteDraft) => Promise<void>
  onDelete?: () => Promise<void>
  editRecord?: AnnouncementRecord | null
  author: CurrentUser | null
  authorReady: boolean
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [iconId, setIconId] = useState(ICON_OPTIONS[0].id)
  const [textColor, setTextColor] = useState(DEFAULT_TEXT_COLOR)
  const [cardColor, setCardColor] = useState(DEFAULT_CARD_COLOR)
  const [colorTarget, setColorTarget] = useState<ColorTarget>("text")
  const [iconMenuOpen, setIconMenuOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageName, setImageName] = useState<string | null>(null)
  const [imageMeta, setImageMeta] = useState<ImageUploadMeta | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [imageFocus, setImageFocus] = useState<ImageFocus>(DEFAULT_IMAGE_FOCUS)
  const [isDragging, setIsDragging] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const iconMenuRef = useRef<HTMLDivElement>(null)
  const imageUrlRef = useRef<string | null>(null)
  const imageBlobRef = useRef<Blob | null>(null)

  const clearImage = useCallback(() => {
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current)
      imageUrlRef.current = null
    }
    imageBlobRef.current = null
    setImageUrl(null)
    setImageName(null)
    setImageMeta(null)
    setImageError(null)
    setImageFocus(DEFAULT_IMAGE_FOCUS)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  const applyImageFile = useCallback(async (file: File | undefined) => {
    if (!file) return

    setImageError(null)

    if (!file.type.startsWith("image/")) {
      setImageError("กรุณาเลือกไฟล์ PNG, JPG หรือ WebP")
      return
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setImageError(
        `รูปใหญ่เกินไป (${formatFileSize(file.size)}) สูงสุด ${formatFileSize(MAX_UPLOAD_BYTES)}`
      )
      return
    }

    setIsCompressing(true)

    try {
      const compressed = await compressImageFile(file)

      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current)

      const url = URL.createObjectURL(compressed)
      imageUrlRef.current = url
      imageBlobRef.current = compressed
      setImageUrl(url)
      setImageName(compressedFileName(file.name))
      setImageMeta({
        originalSize: file.size,
        compressedSize: compressed.size,
      })
      setImageFocus(DEFAULT_IMAGE_FOCUS)
    } catch {
      setImageError("บีบอัดรูปไม่สำเร็จ ลองไฟล์อื่น")
    } finally {
      setIsCompressing(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }, [])

  useEffect(() => {
    if (!open) return

    setColorTarget("text")
    setIconMenuOpen(false)
    setSubmitError(null)
    setIsSubmitting(false)
    setIsDeleting(false)
    setConfirmDelete(false)
    clearImage()

    if (editRecord) {
      setName(editRecord.name)
      setDescription(editRecord.description)
      setIconId(editRecord.icon_id)
      setTextColor(editRecord.text_color)
      setCardColor(editRecord.card_color)
      setImageFocus(normalizeImageFocus(editRecord.image_focus))

      const existingUrl = getAnnouncementImageUrl(editRecord.image_storage_path)
      if (existingUrl) {
        setImageUrl(existingUrl)
        setImageName(editRecord.image_file_name)
        setImageMeta(
          editRecord.image_size_bytes && editRecord.image_original_size_bytes
            ? {
                originalSize: editRecord.image_original_size_bytes,
                compressedSize: editRecord.image_size_bytes,
              }
            : null
        )
      }
      return
    }

    setName("")
    setDescription("")
    setIconId(ICON_OPTIONS[0].id)
    setTextColor(DEFAULT_TEXT_COLOR)
    setCardColor(DEFAULT_CARD_COLOR)
  }, [open, editRecord, clearImage])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      if (iconMenuOpen) {
        setIconMenuOpen(false)
        return
      }
      onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose, iconMenuOpen])

  useEffect(() => {
    return () => {
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current)
    }
  }, [])

  const isEditing = Boolean(editRecord)
  const canEditRecord =
    !isEditing || (author && editRecord?.author_pbri_id === author.studentId)
  const canSubmit =
    name.trim().length > 0 &&
    Boolean(author) &&
    canEditRecord &&
    !isCompressing &&
    !isSubmitting &&
    !isDeleting
  const selectedIcon =
    ICON_OPTIONS.find((option) => option.id === iconId) ?? ICON_OPTIONS[0]
  const PreviewIcon = selectedIcon.Icon
  const previewName = name.trim() || "ชื่อโน้ต"
  const previewDescription =
    description.trim() || "คำอธิบายจะแสดงที่นี่"

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="ปิดหน้าต่าง"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          <motion.form
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.8 }}
            onSubmit={(event) => {
              event.preventDefault()
              if (!canSubmit || !author) return

              void (async () => {
                setIsSubmitting(true)
                setSubmitError(null)
                try {
                  await onSubmit({
                    name: name.trim(),
                    description: description.trim(),
                    iconId,
                    textColor,
                    cardColor,
                    imageUrl,
                    imageBlob: imageBlobRef.current,
                    imageName,
                    imageMeta,
                    imageFocus,
                    imageRemoved: Boolean(
                      editRecord?.image_storage_path && !imageUrl
                    ),
                    author,
                  })
                  imageBlobRef.current = null
                  if (imageUrlRef.current) {
                    URL.revokeObjectURL(imageUrlRef.current)
                    imageUrlRef.current = null
                  }
                } catch (error) {
                  setSubmitError(announcePostErrorMessage(error))
                } finally {
                  setIsSubmitting(false)
                }
              })()
            }}
            className="relative z-10 max-h-[90vh] w-full max-w-3xl space-y-5 overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-xl dark:border-neutral-800"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {isEditing ? "แก้ไขโน้ต" : "โน้ตใหม่"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isEditing
                    ? canEditRecord
                      ? "ปรับรายละเอียดของโน้ตนี้ แล้วบันทึกการเปลี่ยนแปลง"
                      : "เฉพาะผู้สร้างโน้ตเท่านั้นที่แก้ไขได้"
                    : "โน้ตนี้จะถูกเพิ่มไว้ด้านบนของกริด"}
                </p>
              </div>
              <div className="flex shrink-0 items-start gap-3">
                {authorReady && author ? (
                  <AuthorProfile author={author} />
                ) : authorReady ? (
                  <p className="max-w-[140px] text-right text-xs text-muted-foreground">
                    เข้าสู่ระบบเพื่อโพสต์
                  </p>
                ) : (
                  <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={onClose}
                  aria-label="ปิด"
                >
                  <Cross2Icon />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-6 md:grid md:grid-cols-2">
              <div className="order-1 space-y-2 md:order-2 md:sticky md:top-0">
                <Label>ตัวอย่างสด</Label>
                <div className="h-[22rem] overflow-hidden rounded-xl border border-dashed border-border bg-muted/50 p-2 dark:border-neutral-800 dark:bg-neutral-900/40">
                  <BentoCard
                    name={previewName}
                    description={previewDescription}
                    Icon={PreviewIcon}
                    href="/announces"
                    cta="ดูเพิ่มเติม"
                    textColor={textColor}
                    cardColor={cardColor}
                    author={
                      author
                        ? {
                            displayName: author.displayName,
                            avatarUrl: author.avatarUrl,
                          }
                        : undefined
                    }
                    className="h-full w-full !col-span-1"
                    background={tileBackground(imageUrl, imageFocus, cardColor)}
                    clickable={false}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  อัปเดตตามที่พิมพ์ — นี่คือหน้าตาการ์ดบนบอร์ด
                </p>
              </div>

              <div className="order-2 space-y-5 md:order-1">
                <div className="space-y-2">
                  <Label htmlFor="note-name">ชื่อโน้ต</Label>
                  <Input
                    id="note-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="ประชุมรายสัปดาห์"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note-description">คำอธิบาย</Label>
                  <Input
                    id="note-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="สรุปสั้น ๆ ของโน้ต"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <SelectorDropdown
                    label="ไอคอน"
                    valueLabel={selectedIcon.label}
                    valuePreview={<selectedIcon.Icon className="h-4 w-4 shrink-0" />}
                    open={iconMenuOpen}
                    onToggle={() => setIconMenuOpen((open) => !open)}
                    onClose={() => setIconMenuOpen(false)}
                    menuRef={iconMenuRef}
                  >
                    {ICON_OPTIONS.map((option) => {
                      const isSelected = option.id === iconId
                      return (
                        <li key={option.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setIconId(option.id)
                              setIconMenuOpen(false)
                            }}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                              isSelected
                                ? "bg-muted text-foreground dark:bg-neutral-800 dark:text-neutral-100"
                                : "text-foreground hover:bg-muted dark:text-neutral-300 dark:hover:bg-neutral-900"
                            )}
                          >
                            <option.Icon className="h-4 w-4" />
                            {option.label}
                          </button>
                        </li>
                      )
                    })}
                  </SelectorDropdown>

                  <ColorTargetPicker
                    textColor={textColor}
                    cardColor={cardColor}
                    target={colorTarget}
                    onTargetChange={setColorTarget}
                    onTextColorChange={setTextColor}
                    onCardColorChange={setCardColor}
                  />
                </div>

                <div className="space-y-2">
                  <Label>รูปพื้นหลัง</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    disabled={isCompressing}
                    onChange={(event) => {
                      void applyImageFile(event.target.files?.[0])
                    }}
                  />

                  {imageError && (
                    <p
                      role="alert"
                      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                    >
                      {imageError}
                    </p>
                  )}

                  {isCompressing ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-gray-50 px-4 py-8 text-center dark:border-neutral-700 dark:bg-zinc-800">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">
                        กำลังบีบอัดรูป…
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ปรับขนาดและแปลงเป็น WebP
                      </p>
                    </div>
                  ) : imageUrl ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 rounded-lg border border-border bg-gray-50 p-3 dark:border-neutral-700 dark:bg-zinc-800">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {imageName}
                          </p>
                          {imageMeta && <ImageSizeBadge meta={imageMeta} />}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                          >
                            เปลี่ยนรูป
                          </button>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={clearImage}
                          aria-label="ลบรูป"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <ImageCropper
                        imageUrl={imageUrl}
                        focus={imageFocus}
                        onChange={setImageFocus}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      onDragEnter={(event) => {
                        event.preventDefault()
                        setIsDragging(true)
                      }}
                      onDragOver={(event) => {
                        event.preventDefault()
                        setIsDragging(true)
                      }}
                      onDragLeave={(event) => {
                        event.preventDefault()
                        setIsDragging(false)
                      }}
                      onDrop={(event) => {
                        event.preventDefault()
                        setIsDragging(false)
                        void applyImageFile(event.dataTransfer.files?.[0])
                      }}
                      className={cn(
                        "flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
                        isDragging
                          ? "border-neutral-800 bg-muted dark:border-border dark:bg-neutral-800"
                          : "border-neutral-300 bg-gray-50 hover:bg-muted dark:border-neutral-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                      )}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200/70 dark:bg-neutral-700">
                        {isDragging ? (
                          <Upload className="h-5 w-5 text-foreground" />
                        ) : (
                          <ImagePlus className="h-5 w-5 text-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          ลากรูปมาวาง หรือคลิกเพื่อเลือก
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG หรือ WebP · สูงสุด {formatFileSize(MAX_UPLOAD_BYTES)} ·
                          บีบอัดเป็น WebP อัตโนมัติ
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              {isEditing && onDelete && (
                <div className="me-auto flex items-center gap-2">
                  {confirmDelete ? (
                    <>
                      <span className="text-xs text-muted-foreground">
                        ลบโน้ตนี้ถาวร?
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmDelete(false)}
                        disabled={isDeleting}
                      >
                        ไม่ลบ
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-red-600 text-white hover:bg-red-700"
                        disabled={isDeleting}
                        onClick={() => {
                          void (async () => {
                            setIsDeleting(true)
                            setSubmitError(null)
                            try {
                              await onDelete()
                            } catch (error) {
                              setSubmitError(announcePostErrorMessage(error))
                              setIsDeleting(false)
                              setConfirmDelete(false)
                            }
                          })()
                        }}
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="me-2 h-4 w-4 animate-spin" />
                            กำลังลบ...
                          </>
                        ) : (
                          "ยืนยันลบ"
                        )}
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
                      onClick={() => setConfirmDelete(true)}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="me-2 h-4 w-4" />
                      ลบโน้ต
                    </Button>
                  )}
                </div>
              )}
              {submitError && (
                <p
                  role="alert"
                  className="max-w-sm text-xs text-red-600 dark:text-red-400"
                >
                  {submitError}
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting || isDeleting}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {isEditing ? "กำลังบันทึก..." : "กำลังโพสต์..."}
                  </>
                ) : isEditing ? (
                  "บันทึกการแก้ไข"
                ) : (
                  "เพิ่มโน้ต"
                )}
              </Button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  )
}

export default function AnnouncesPage() {
  return (
    <Suspense fallback={null}>
      <BentoDemo />
    </Suspense>
  )
}

function BentoDemo() {
  const [features, setFeatures] = useState(initialFeatures)
  const [records, setRecords] = useState<AnnouncementRecord[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { user, ready: authorReady } = useCurrentUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("edit")

  const load = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const nextRecords = await fetchAnnouncements()
      const authors = await resolveAuthorsForRecords(nextRecords)
      setRecords(nextRecords)
      setFeatures(recordsToFeatures(nextRecords, authors))
    } catch (error) {
      setLoadError(announceLoadErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const editRecord = useMemo(
    () => (editId ? records.find((record) => record.id === editId) ?? null : null),
    [editId, records]
  )

  useEffect(() => {
    if (editRecord) setIsDialogOpen(true)
  }, [editRecord])

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false)
    if (editId) router.replace("/announces")
  }, [editId, router])

  const handlePost = useCallback(
    async (draft: NoteDraft) => {
      const targetRecord =
        editRecord ?? (editId ? await fetchAnnouncement(editId) : null)

      if (editId && targetRecord) {
        if (user && targetRecord.author_pbri_id !== user.studentId) {
          throw new Error("คุณไม่มีสิทธิ์แก้ไขโน้ตนี้")
        }

        const record = await updateAnnouncement({
          id: targetRecord.id,
          name: draft.name,
          description: draft.description,
          iconId: draft.iconId,
          textColor: draft.textColor,
          cardColor: draft.cardColor,
          imageFocus: draft.imageFocus,
          imageBlob: draft.imageBlob,
          imageName: draft.imageName,
          imageMeta: draft.imageMeta,
          imageRemoved: draft.imageRemoved,
          previousStoragePath: targetRecord.image_storage_path,
        })

        setRecords((current) =>
          current.map((item) => (item.id === record.id ? record : item))
        )
        setIsDialogOpen(false)
        router.replace("/announces")
        await load()
        return
      }

      const record = await createAnnouncement({
        name: draft.name,
        description: draft.description,
        iconId: draft.iconId,
        textColor: draft.textColor,
        cardColor: draft.cardColor,
        imageFocus: draft.imageFocus,
        imageBlob: draft.imageBlob,
        imageName: draft.imageName,
        imageMeta: draft.imageMeta,
        author: draft.author,
      })

      setRecords((current) => [record, ...current])
      setFeatures((current) => {
        const { items, placement } = placeAtTop(current)
        const feature = recordToFeature(record, draft.author, placement)
        return [feature, ...items]
      })
      setIsDialogOpen(false)
    },
    [editRecord, editId, load, router, user]
  )

  const handleDelete = useCallback(async () => {
    if (!editRecord) return
    await deleteAnnouncement(editRecord)
    setRecords((current) => current.filter((item) => item.id !== editRecord.id))
    setIsDialogOpen(false)
    router.replace("/announces")
    await load()
  }, [editRecord, load, router])

  return (
    <div className="container space-y-4 p-[20px] no-scrollbar">
      <div className="flex items-center justify-between gap-4 no-scrollbar">
        <div className="no-scrollbar">
          <h1 className="text-2xl font-semibold text-foreground">
            โน้ตประกาศ
          </h1>
          <p className="text-sm text-muted-foreground">
            อยู่ระหว่างการพัฒนา
          </p>
        </div>
        {user && (
          <Button type="button" onClick={() => setIsDialogOpen(true)}>
            <PlusIcon className="me-2 h-4 w-4" />
            เพิ่มการ์ด
          </Button>
        )}
      </div>

      <BentoGrid className="lg:grid-cols-4">
        {isLoading ? (
          <BentoGridSkeleton count={4} />
        ) : loadError ? (
          <p className="col-span-full text-sm text-red-600 dark:text-red-400">{loadError}</p>
        ) : features.length === 0 ? (
          <p className="col-span-full text-sm text-muted-foreground">
            ยังไม่มีโน้ตประกาศ เพิ่มการ์ดแรกได้เลย
          </p>
        ) : (
          features.map((feature) => (
            <BentoCard
              key={feature.id}
              {...feature}
              textColor={feature.textColor}
              cardColor={feature.cardColor}
              author={{
                displayName: feature.author.displayName,
                avatarUrl: feature.author.avatarUrl,
              }}
            />
          ))
        )}
      </BentoGrid>

      <AddNoteDialog
        open={isDialogOpen}
        onClose={closeDialog}
        onSubmit={handlePost}
        onDelete={editRecord ? handleDelete : undefined}
        editRecord={editRecord}
        author={user}
        authorReady={authorReady}
      />
    </div>
  )
}
