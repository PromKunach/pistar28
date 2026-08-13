"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  CalendarClock,
  ChevronDown,
  Eye,
  EyeOff,
  ImagePlus,
  Link2,
  Loader2,
  Maximize2,
  MessageSquare,
  Minus,
  PanelBottom,
  Paperclip,
  Pencil,
  Plus,
  Send,
  SquareArrowOutUpRight,
  Trash2,
  Type,
  Unlink,
  User,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fetchAnnouncement } from "@/lib/announcements"
import { useCurrentUser } from "@/lib/userProfile"
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  canEditBlock,
  createBoard,
  createCommentBlock,
  createCounterBlock,
  createDockBlock,
  createLinkBlock,
  createTextBlock,
  COMMENT_IMAGE_MAX_BYTES,
  COMMENT_IMAGE_MAX_DIMENSION,
  DEFAULT_COMMENT_WIDTH,
  DEFAULT_COUNTER_WIDTH,
  DEFAULT_DOCK_WIDTH,
  DEFAULT_LINK_WIDTH,
  LINK_NODE_SIZE,
  fetchBoard,
  isCommentBlock,
  isCounterBlock,
  isDockBlock,
  isLinkBlock,
  isTextBlock,
  normalizeBoardBlocksForSave,
  recordToBoardContent,
  updateBoard,
  type BoardBlock,
  type BoardCommentBlock,
  type BoardCommentEntry,
  type BoardConnection,
  type BoardCounterBlock,
  type BoardDockBlock,
  type BoardLinkBlock,
  type BoardTextBlock,
} from "@/lib/announcementBoard"

function boardSaveErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: string }).message)
    if (
      message.includes("announcement_boards") &&
      message.includes("does not exist")
    ) {
      return "ไม่พบตาราง announcement_boards กรุณารัน supabase/announcement_boards.sql ก่อน"
    }
    if (message.includes("row-level security")) {
      return "ไม่มีสิทธิ์บันทึก ตรวจสอบนโยบาย RLS ใน Supabase"
    }
    return message
  }
  return "บันทึกบอร์ดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
}

type Point = { x: number; y: number }
type Size = { width: number; height: number }

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** Keeps the board inside the viewport; allows centering when zoomed out. */
function clampPan(pan: Point, viewport: Size, zoom: number): Point {
  const boardW = BOARD_WIDTH * zoom
  const boardH = BOARD_HEIGHT * zoom
  const minX = Math.min(0, viewport.width - boardW)
  const maxX = Math.max(0, viewport.width - boardW)
  const minY = Math.min(0, viewport.height - boardH)
  const maxY = Math.max(0, viewport.height - boardH)
  return {
    x: clamp(pan.x, minX, maxX),
    y: clamp(pan.y, minY, maxY),
  }
}

function centerPan(viewport: Size, zoom: number): Point {
  return {
    x: (viewport.width - BOARD_WIDTH * zoom) / 2,
    y: (viewport.height - BOARD_HEIGHT * zoom) / 2,
  }
}

function viewportCenter(viewport: Size): Point {
  return { x: viewport.width / 2, y: viewport.height / 2 }
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function BlockKindIcon({
  block,
  className,
}: {
  block: BoardBlock
  className?: string
}) {
  if (isCounterBlock(block)) {
    return (
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-blue-500 bg-white text-[10px] font-bold text-blue-600",
          className
        )}
      >
        #
      </span>
    )
  }
  if (isCommentBlock(block)) {
    return (
      <MessageSquare
        className={cn("h-4 w-4 shrink-0 text-neutral-500", className)}
      />
    )
  }
  if (isLinkBlock(block)) {
    return (
      <Paperclip
        className={cn("h-4 w-4 shrink-0 text-neutral-500", className)}
      />
    )
  }
  if (isDockBlock(block)) {
    return (
      <PanelBottom
        className={cn("h-4 w-4 shrink-0 text-neutral-500", className)}
      />
    )
  }
  return <Type className={cn("h-4 w-4 shrink-0 text-neutral-500", className)} />
}

function blockLabel(block: BoardBlock) {
  if (isCounterBlock(block)) {
    const name = block.name.trim()
    return name.length > 72 ? `${name.slice(0, 72)}…` : name || "ตัวนับ"
  }
  if (isCommentBlock(block)) {
    const title = block.title.trim()
    return title.length > 72 ? `${title.slice(0, 72)}…` : title || "ความคิดเห็น"
  }
  if (isLinkBlock(block)) {
    const label = block.name.trim() || block.url.trim()
    return label.length > 72 ? `${label.slice(0, 72)}…` : label || "ลิงก์"
  }
  if (isDockBlock(block)) {
    const count = block.dockedBlockIds.length
    return count > 0 ? `ด็อก (${count})` : "ด็อก"
  }
  const text = block.text.trim()
  return text.length > 72 ? `${text.slice(0, 72)}…` : text || "ข้อความไม่มีชื่อ"
}

type BlockRect = { x: number; y: number; w: number; h: number }

const DEFAULT_BLOCK_HEIGHT = 128
/** Height used for connection anchors on counter nodes (name + pill row only). */
const COUNTER_PILL_ANCHOR_HEIGHT = 58
/** Collapsed comment block shell — expanded thread does not move connections. */
const COMMENT_BLOCK_ANCHOR_HEIGHT = DEFAULT_BLOCK_HEIGHT
const DEFAULT_DOCK_BLOCK_HEIGHT = 168
const DOCK_SNAP_GAP_PX = 8
const DOCK_SNAP_THRESHOLD_PX = 48
const DOCK_SNAP_GAP_FRACTION = DOCK_SNAP_GAP_PX / BOARD_HEIGHT

async function compressCommentImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("รองรับเฉพาะไฟล์รูปภาพ")
  }
  if (file.size > COMMENT_IMAGE_MAX_BYTES * 4) {
    throw new Error("รูปภาพใหญ่เกินไป กรุณาเลือกไฟล์ที่เล็กกว่า")
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("อ่านไฟล์รูปไม่สำเร็จ"))
    reader.readAsDataURL(file)
  })

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("โหลดรูปภาพไม่สำเร็จ"))
    img.src = dataUrl
  })

  const scale = Math.min(
    1,
    COMMENT_IMAGE_MAX_DIMENSION / Math.max(image.width, image.height)
  )
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("ไม่สามารถประมวลผลรูปได้")
  ctx.drawImage(image, 0, 0, width, height)

  let quality = 0.88
  let output = canvas.toDataURL("image/jpeg", quality)
  while (output.length > COMMENT_IMAGE_MAX_BYTES * 1.37 && quality > 0.45) {
    quality -= 0.08
    output = canvas.toDataURL("image/jpeg", quality)
  }

  if (output.length > COMMENT_IMAGE_MAX_BYTES * 1.37) {
    throw new Error("รูปภาพใหญ่เกินไปหลังบีบอัด กรุณาเลือกรูปที่เล็กลง")
  }

  return output
}

function blockConnectionHeight(block: BoardBlock, heights: Record<string, number>) {
  if (isCounterBlock(block)) {
    return heights[block.id] ?? COUNTER_PILL_ANCHOR_HEIGHT
  }
  if (isCommentBlock(block)) {
    return heights[block.id] ?? COMMENT_BLOCK_ANCHOR_HEIGHT
  }
  if (isLinkBlock(block)) {
    return heights[block.id] ?? LINK_NODE_SIZE
  }
  if (isDockBlock(block)) {
    return heights[block.id] ?? DEFAULT_DOCK_BLOCK_HEIGHT
  }
  return heights[block.id] ?? DEFAULT_BLOCK_HEIGHT
}

function counterUserHasVoted(
  block: BoardCounterBlock,
  studentId: string | undefined
) {
  if (!studentId) return false
  return block.increments.some((entry) => entry.user.studentId === studentId)
}
const MIN_ZOOM = 0.35
const MAX_ZOOM = 2
const DEFAULT_ZOOM = 1

function zoomAtPoint(
  pan: Point,
  zoom: number,
  nextZoom: number,
  pointer: Point
): Point {
  const boardX = (pointer.x - pan.x) / zoom
  const boardY = (pointer.y - pan.y) / zoom
  return {
    x: pointer.x - boardX * nextZoom,
    y: pointer.y - boardY * nextZoom,
  }
}

function clampZoom(value: number) {
  return clamp(value, MIN_ZOOM, MAX_ZOOM)
}

function blockLayoutWidth(block: BoardBlock) {
  if (isCounterBlock(block)) return DEFAULT_COUNTER_WIDTH
  if (isCommentBlock(block)) return DEFAULT_COMMENT_WIDTH
  if (isLinkBlock(block)) return DEFAULT_LINK_WIDTH
  if (isDockBlock(block)) return DEFAULT_DOCK_WIDTH
  return block.width
}

function blockRect(block: BoardBlock, heightPx: number): BlockRect {
  const width = blockLayoutWidth(block)
  return {
    x: block.x * BOARD_WIDTH,
    y: block.y * BOARD_HEIGHT,
    w: width * BOARD_WIDTH,
    h: heightPx,
  }
}

function collectDockedBlockIds(blocks: BoardBlock[]) {
  const set = new Set<string>()
  for (const block of blocks) {
    if (isDockBlock(block)) {
      for (const id of block.dockedBlockIds) set.add(id)
    }
  }
  return set
}

function findDockForBlock(
  blocks: BoardBlock[],
  blockId: string
): BoardDockBlock | null {
  for (const block of blocks) {
    if (isDockBlock(block) && block.dockedBlockIds.includes(blockId)) {
      return block
    }
  }
  return null
}

function isCanvasBlockVisible(
  blockId: string,
  blocks: BoardBlock[],
  dockedOutIds: Set<string>,
  dockOutHidden: Set<string>
) {
  const dock = findDockForBlock(blocks, blockId)
  if (!dock) return true
  if (!dockedOutIds.has(blockId)) return false
  return !dockOutHidden.has(dock.id)
}

function dockChildPair(
  from: BoardBlock,
  to: BoardBlock,
  blocks: BoardBlock[]
): { dock: BoardDockBlock; childId: string } | null {
  if (isDockBlock(from) && findDockForBlock(blocks, to.id)?.id === from.id) {
    return { dock: from, childId: to.id }
  }
  if (isDockBlock(to) && findDockForBlock(blocks, from.id)?.id === to.id) {
    return { dock: to, childId: from.id }
  }
  return null
}

function isConnectionEndpointVisible(
  blockId: string,
  otherBlockId: string,
  blocks: BoardBlock[],
  dockedOutIds: Set<string>,
  dockOutHidden: Set<string>
) {
  const block = blocks.find((item) => item.id === blockId)
  const other = blocks.find((item) => item.id === otherBlockId)
  if (!block || !other) return false

  const pair = dockChildPair(block, other, blocks)
  if (pair) {
    if (!dockedOutIds.has(pair.childId)) return false
    if (dockOutHidden.has(pair.dock.id)) return false
    return true
  }

  return isCanvasBlockVisible(blockId, blocks, dockedOutIds, dockOutHidden)
}

function dockedItemConnectionRect(
  dock: BoardDockBlock,
  blockId: string,
  dockHeight: number
): BlockRect {
  const fullRect = blockRect(dock, dockHeight)
  const index = Math.max(0, dock.dockedBlockIds.indexOf(blockId))
  const headerAndBody = 88
  const dropZonePadding = 16
  const itemRow = 44
  const itemCenterY =
    fullRect.y + headerAndBody + dropZonePadding + index * itemRow + itemRow / 2
  const itemW = fullRect.w * 0.85
  const itemH = 36
  return {
    x: fullRect.x + (fullRect.w - itemW) / 2,
    y: itemCenterY - itemH / 2,
    w: itemW,
    h: itemH,
  }
}

function connectionEndpointRect(
  block: BoardBlock,
  blocks: BoardBlock[],
  heights: Record<string, number>,
  dockedOutIds: Set<string>
): BlockRect {
  const dock = findDockForBlock(blocks, block.id)
  if (dock && !dockedOutIds.has(block.id)) {
    return dockedItemConnectionRect(
      dock,
      block.id,
      heights[dock.id] ?? DEFAULT_DOCK_BLOCK_HEIGHT
    )
  }
  return blockRect(block, blockConnectionHeight(block, heights))
}

function computeDockOutPosition(
  dock: BoardDockBlock,
  block: BoardBlock,
  outIndex: number
) {
  const blockW = blockLayoutWidth(block)
  return {
    x: clamp(dock.x + DEFAULT_DOCK_WIDTH + 0.02, 0, Math.max(0, 1 - blockW)),
    y: clamp(dock.y + outIndex * 0.055, 0, 0.92),
  }
}

function dockConnectionExists(
  connections: BoardConnection[],
  dockId: string,
  blockId: string
) {
  return connections.some(
    (connection) =>
      (connection.fromId === dockId && connection.toId === blockId) ||
      (connection.fromId === blockId && connection.toId === dockId)
  )
}

function isDockSnapTarget(
  block: BoardBlock,
  blocks: BoardBlock[],
  dockedOutIds: Set<string>,
  dockOutHidden: Set<string>
) {
  return (
    isTextBlock(block) &&
    isCanvasBlockVisible(block.id, blocks, dockedOutIds, dockOutHidden)
  )
}

function isValidConnectionEndpoints(from: BoardBlock, to: BoardBlock) {
  if (isDockBlock(from) && isDockBlock(to)) return false
  return true
}

function computeDockSnapPosition(
  dock: BoardDockBlock,
  x: number,
  y: number,
  blocks: BoardBlock[],
  heights: Record<string, number>,
  dockedOutIds: Set<string>,
  dockOutHidden: Set<string>
) {
  const dockW = blockLayoutWidth(dock) * BOARD_WIDTH
  const dockH = heights[dock.id] ?? DEFAULT_DOCK_BLOCK_HEIGHT
  const dockTopPx = y * BOARD_HEIGHT
  const dockBottomPx = dockTopPx + dockH
  const dockLeft = x * BOARD_WIDTH
  const dockRight = dockLeft + dockW

  let best: {
    id: string
    x: number
    y: number
    dist: number
    side: "above" | "below"
  } | null = null

  for (const block of blocks) {
    if (
      !isDockSnapTarget(block, blocks, dockedOutIds, dockOutHidden) ||
      block.id === dock.id
    ) {
      continue
    }
    const parentH = heights[block.id] ?? DEFAULT_BLOCK_HEIGHT
    const parentRect = blockRect(block, parentH)
    const parentTopPx = parentRect.y
    const parentBottomPx = parentRect.y + parentRect.h
    const overlap =
      dockRight > parentRect.x + 16 &&
      dockLeft < parentRect.x + parentRect.w - 16
    if (!overlap) continue

    const distAbove = Math.abs(dockBottomPx + DOCK_SNAP_GAP_PX - parentTopPx)
    if (distAbove <= DOCK_SNAP_THRESHOLD_PX) {
      const snapY = (parentTopPx - dockH - DOCK_SNAP_GAP_PX) / BOARD_HEIGHT
      if (!best || distAbove < best.dist) {
        best = {
          id: block.id,
          x: block.x,
          y: snapY,
          dist: distAbove,
          side: "above",
        }
      }
    }

    const distBelow = Math.abs(dockTopPx - DOCK_SNAP_GAP_PX - parentBottomPx)
    if (distBelow <= DOCK_SNAP_THRESHOLD_PX) {
      const snapY = (parentBottomPx + DOCK_SNAP_GAP_PX) / BOARD_HEIGHT
      if (!best || distBelow < best.dist) {
        best = {
          id: block.id,
          x: block.x,
          y: snapY,
          dist: distBelow,
          side: "below",
        }
      }
    }
  }

  if (best) {
    return {
      x: best.x,
      y: best.y,
      snapToId: best.id,
      snapSide: best.side,
    }
  }
  return { x, y, snapToId: null as string | null, snapSide: null as "above" | "below" | null }
}

function findDockDropTarget(
  draggedBlock: BoardBlock,
  x: number,
  y: number,
  heightFraction: number,
  blocks: BoardBlock[],
  heights: Record<string, number>
): BoardDockBlock | null {
  if (isDockBlock(draggedBlock)) return null

  const w = blockLayoutWidth(draggedBlock) * BOARD_WIDTH
  const h = heightFraction * BOARD_HEIGHT
  const centerX = x * BOARD_WIDTH + w / 2
  const centerY = y * BOARD_HEIGHT + h / 2

  for (const block of blocks) {
    if (!isDockBlock(block) || block.id === draggedBlock.id) continue
    const dockH = heights[block.id] ?? DEFAULT_DOCK_BLOCK_HEIGHT
    const rect = blockRect(block, dockH)
    if (
      centerX >= rect.x &&
      centerX <= rect.x + rect.w &&
      centerY >= rect.y &&
      centerY <= rect.y + rect.h
    ) {
      return block
    }
  }
  return null
}

function rectCenter(rect: BlockRect): Point {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 }
}

function edgeAnchor(rect: BlockRect, toward: Point): Point {
  const center = rectCenter(rect)
  const dx = toward.x - center.x
  const dy = toward.y - center.y
  if (dx === 0 && dy === 0) return center

  const halfW = rect.w / 2
  const halfH = rect.h / 2
  const scale = Math.min(
    dx !== 0 ? halfW / Math.abs(dx) : Number.POSITIVE_INFINITY,
    dy !== 0 ? halfH / Math.abs(dy) : Number.POSITIVE_INFINITY
  )

  return {
    x: center.x + dx * scale,
    y: center.y + dy * scale,
  }
}

function edgeOutward(point: Point, rect: BlockRect): Point {
  const tol = 1.5
  if (point.x <= rect.x + tol) return { x: -1, y: 0 }
  if (point.x >= rect.x + rect.w - tol) return { x: 1, y: 0 }
  if (point.y <= rect.y + tol) return { x: 0, y: -1 }
  return { x: 0, y: 1 }
}

function bezierPath(
  start: Point,
  startNormal: Point,
  end: Point,
  endNormal: Point
) {
  const dist = Math.hypot(end.x - start.x, end.y - start.y)
  const offset = Math.min(Math.max(dist * 0.35, 48), 180)
  const cp1 = {
    x: start.x + startNormal.x * offset,
    y: start.y + startNormal.y * offset,
  }
  const cp2 = {
    x: end.x + endNormal.x * offset,
    y: end.y + endNormal.y * offset,
  }

  return `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`
}

function normalizeLinkUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function connectionGeometryFromRects(fromRect: BlockRect, toRect: BlockRect) {
  const toCenter = rectCenter(toRect)
  const fromCenter = rectCenter(fromRect)
  const start = edgeAnchor(fromRect, toCenter)
  const end = edgeAnchor(toRect, fromCenter)

  return {
    path: bezierPath(
      start,
      edgeOutward(start, fromRect),
      end,
      edgeOutward(end, toRect)
    ),
    start,
    end,
  }
}

function connectionGeometry(
  from: BoardBlock,
  to: BoardBlock,
  blocks: BoardBlock[],
  heights: Record<string, number>,
  dockedOutIds: Set<string>
) {
  return connectionGeometryFromRects(
    connectionEndpointRect(from, blocks, heights, dockedOutIds),
    connectionEndpointRect(to, blocks, heights, dockedOutIds)
  )
}

function renderBoardConnections(
  connections: BoardConnection[],
  blocks: BoardBlock[],
  blockHeights: Record<string, number>,
  dockedOutIds: Set<string>,
  dockOutHidden: Set<string>
) {
  return connections.map((connection) => {
    const from = blocks.find((block) => block.id === connection.fromId)
    const to = blocks.find((block) => block.id === connection.toId)
    if (!from || !to) return null
    if (!isValidConnectionEndpoints(from, to)) return null

    const fromVisible = isConnectionEndpointVisible(
      connection.fromId,
      connection.toId,
      blocks,
      dockedOutIds,
      dockOutHidden
    )
    const toVisible = isConnectionEndpointVisible(
      connection.toId,
      connection.fromId,
      blocks,
      dockedOutIds,
      dockOutHidden
    )
    if (!fromVisible || !toVisible) return null

    const geometry = connectionGeometry(
      from,
      to,
      blocks,
      blockHeights,
      dockedOutIds
    )

    return (
      <g key={connection.id}>
        <path
          d={geometry.path}
          fill="none"
          stroke="rgb(82 82 91)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx={geometry.start.x} cy={geometry.start.y} r="4" fill="rgb(82 82 91)" />
        <circle cx={geometry.end.x} cy={geometry.end.y} r="6" fill="rgb(82 82 91)" />
      </g>
    )
  })
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable
}

type PanDrag = {
  pointerId: number
  startX: number
  startY: number
  origin: Point
}

type BlockDrag = {
  pointerId: number
  blockId: string
  startX: number
  startY: number
  originX: number
  originY: number
  heightFraction: number
  moved: boolean
}

function LinkNodeBlock({
  block,
  isRevealed,
  onPointerDown,
  onPointerUp,
  onSelect,
  onMeasure,
}: {
  block: BoardLinkBlock
  isRevealed: boolean
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void
  onSelect: () => void
  onMeasure: (height: number) => void
}) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const href = normalizeLinkUrl(block.url)
  const displayName = block.name.trim() || block.url.trim() || "ลิงก์"

  useLayoutEffect(() => {
    const element = anchorRef.current
    if (!element) return

    const report = () => onMeasure(element.offsetHeight)
    report()

    const observer = new ResizeObserver(report)
    observer.observe(element)
    return () => observer.disconnect()
  }, [onMeasure, displayName, isRevealed])

  return (
    <div
      data-block={block.id}
      data-link-node
      data-link-node-id={block.id}
      role="button"
      tabIndex={0}
      aria-expanded={isRevealed}
      aria-label={displayName}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onSelect()
        }
      }}
      style={{
        left: `${block.x * 100}%`,
        top: `${block.y * 100}%`,
        width: `${DEFAULT_LINK_WIDTH * 100}%`,
      }}
      className="absolute z-20 flex cursor-pointer flex-col items-stretch overflow-visible select-none outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
    >
      <div
        ref={anchorRef}
        data-link-node-anchor
        className="link-node relative flex h-[3.25rem] min-w-[3.25rem] items-center overflow-hidden rounded-full border border-neutral-200/80 bg-white pe-3 ps-1 shadow-md"
      >
        <span
          className="link-node-shimmer pointer-events-none absolute inset-0"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute inset-0 bg-white/80"
          aria-hidden="true"
        />

        <span className="relative z-10 flex h-[2.75rem] w-[2.75rem] shrink-0 items-center justify-center">
          <Paperclip className="h-5 w-5 text-neutral-700" strokeWidth={2.25} />
        </span>

        <span className="relative z-10 min-w-0 flex-1 truncate text-sm font-semibold leading-tight text-neutral-800 dark:text-neutral-100">
          {displayName}
        </span>
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows,margin-top,opacity] duration-300 ease-out",
          isRevealed
            ? "mt-1.5 grid-rows-[1fr] opacity-100"
            : "mt-0 grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
              className="block w-full rounded-full border border-neutral-200 bg-white px-3 py-2 text-center text-sm font-medium text-neutral-800 shadow-[0_2px_6px_rgba(0,0,0,0.06)] transition-colors duration-200 hover:border-neutral-300 hover:bg-neutral-50 active:scale-[0.98]"
            >
              ไปที่ลิงก์
            </a>
          ) : (
            <span className="block w-full rounded-full border border-neutral-200 bg-white px-3 py-2 text-center text-sm font-medium text-neutral-400 shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
              ไปที่ลิงก์
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function DockBlock({
  block,
  dockedBlocks,
  dockedOutIds,
  outNodesVisible,
  isExpanded,
  isSnapTarget,
  canEdit,
  onPointerDown,
  onPointerUp,
  onSelect,
  onMeasure,
  onToggleOutVisibility,
  onToggleOut,
  onUndock,
  onOpenPanel,
}: {
  block: BoardDockBlock
  dockedBlocks: BoardBlock[]
  dockedOutIds: Set<string>
  outNodesVisible: boolean
  isExpanded: boolean
  isSnapTarget: boolean
  canEdit: boolean
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void
  onSelect: () => void
  onMeasure: (height: number) => void
  onToggleOutVisibility: () => void
  onToggleOut: (blockId: string) => void
  onUndock: (blockId: string) => void
  onOpenPanel: () => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const isSnapComplete = block.snapToId !== null

  useLayoutEffect(() => {
    const element = rootRef.current
    if (!element) return

    const report = () => onMeasure(element.offsetHeight)
    report()

    const observer = new ResizeObserver(report)
    observer.observe(element)
    return () => observer.disconnect()
  }, [onMeasure, dockedBlocks.length, isExpanded, isSnapComplete])

  return (
    <div
      ref={rootRef}
      data-block={block.id}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onSelect}
      style={{
        left: `${block.x * 100}%`,
        top: `${block.y * 100}%`,
        width: `${block.width * 100}%`,
      }}
      className={cn(
        "absolute z-0 cursor-move select-none transition-[box-shadow,border-color,transform] duration-300 ease-out",
        isExpanded && "scale-[1.02]",
        isSnapTarget && "ring-2 ring-blue-200/80"
      )}
    >
      <div className="relative">
        {!isSnapComplete && (
          <>
            <div
              data-dock-bar-top
              className="absolute bottom-full left-0 mb-2 h-2.5 w-full rounded-full border-2 border-dashed border-neutral-300 bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800"
              aria-hidden="true"
            />
            <div
              data-dock-bar-bottom
              className="absolute top-full left-0 mt-2 h-2.5 w-full rounded-full border-2 border-dashed border-neutral-300 bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800"
              aria-hidden="true"
            />
          </>
        )}

        <div
          data-dock-block-anchor
          className={cn(
            "relative rounded-lg border bg-white p-3 shadow-[0_2px_6px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-[border-color,box-shadow] duration-300 dark:bg-neutral-900",
            isExpanded
              ? "border-neutral-900 shadow-[0_4px_10px_rgba(0,0,0,0.1),0_16px_40px_rgba(0,0,0,0.18)] dark:border-neutral-100 dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
              : "border-transparent hover:border-neutral-300",
            isSnapTarget && "border-blue-400 ring-2 ring-blue-200/80"
          )}
        >
          {isExpanded && canEdit && (
            <button
              type="button"
              aria-label="เปิดรายละเอียดด็อก"
              data-dock-control
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation()
                onOpenPanel()
              }}
              className={cn(
                "absolute top-2 right-2 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-neutral-200 bg-white/95 text-neutral-600 shadow-sm transition-all duration-200 hover:bg-neutral-50 hover:text-neutral-900 active:scale-95 dark:border-neutral-700 dark:bg-neutral-800/95 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-100",
                isExpanded
                  ? "translate-y-0 opacity-100 delay-100"
                  : "pointer-events-none translate-y-1 opacity-0"
              )}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}

          <div className="flex items-center justify-between gap-2 pe-8">
            <p className="text-xs font-semibold tracking-wide text-neutral-500">
              ด็อก
            </p>
            {isExpanded && dockedBlocks.length > 0 && (
              <button
                type="button"
                data-dock-control
                aria-label={
                  outNodesVisible
                    ? "ซ่อน Node ที่เชื่อมอยู่"
                    : "แสดง Node ที่เชื่อมอยู่"
                }
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleOutVisibility()
                }}
                className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                {outNodesVisible ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>
            )}
          </div>

          <div className="flex min-h-12 flex-col items-center justify-center px-1">
            <p className="w-full text-center text-sm font-medium text-neutral-700 dark:text-neutral-200">
              {dockedBlocks.length > 0
                ? `${dockedBlocks.length}  Node `
                : "ด็อก"}
            </p>
          </div>

          <div
            className={cn(
              "grid transition-[grid-template-rows,margin-top,opacity] duration-300 ease-out",
              isExpanded
                ? "mt-2.5 grid-rows-[1fr] opacity-100"
                : "mt-0 grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <div
                data-dock-drop-zone
                className={cn(
                  "flex min-h-20 flex-col gap-2 rounded-xl border border-dashed p-2 transition-colors duration-200",
                  isSnapTarget
                    ? "border-blue-300 bg-blue-50/80 dark:border-blue-700 dark:bg-blue-950/30"
                    : "border-neutral-200 bg-neutral-50/80 dark:border-neutral-700 dark:bg-neutral-800/50"
                )}
              >
                {dockedBlocks.length === 0 ? (
                  <p className="flex flex-1 items-center justify-center py-6 text-center text-xs text-neutral-400">
                    วาง Node ที่นี่
                  </p>
                ) : (
                  dockedBlocks.map((docked) => {
                    const isOut = dockedOutIds.has(docked.id)
                    return (
                      <div
                        key={docked.id}
                        data-dock-item={docked.id}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border bg-white px-2 py-2 shadow-sm transition-[border-color,box-shadow] duration-200 dark:bg-neutral-900",
                          isOut
                            ? "border-blue-400 ring-2 ring-blue-200/80 dark:border-blue-500 dark:ring-blue-900/50"
                            : "border-neutral-200 dark:border-neutral-700"
                        )}
                      >
                        <button
                          type="button"
                          data-dock-control
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation()
                            onToggleOut(docked.id)
                          }}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <BlockKindIcon block={docked} />
                          <span className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
                            {blockLabel(docked)}
                          </span>
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            data-dock-control
                            aria-label={`นำ ${blockLabel(docked)} ออกจากด็อกถาวร`}
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation()
                              onUndock(docked.id)
                            }}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                          >
                            <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TextBlock({
  block,
  isExpanded,
  canEdit,
  onPointerDown,
  onPointerUp,
  onSelect,
  onEdit,
  onMeasure,
}: {
  block: BoardTextBlock
  isExpanded: boolean
  canEdit: boolean
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void
  onSelect: () => void
  onEdit: () => void
  onMeasure: (height: number) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const element = rootRef.current
    if (!element) return

    const report = () => onMeasure(element.offsetHeight)
    report()

    const observer = new ResizeObserver(report)
    observer.observe(element)
    return () => observer.disconnect()
  }, [onMeasure, block.text, block.description, isExpanded])

  return (
    <div
      ref={rootRef}
      data-block={block.id}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onSelect}
      style={{
        left: `${block.x * 100}%`,
        top: `${block.y * 100}%`,
        width: `${block.width * 100}%`,
        color: block.color,
        fontSize: block.fontSize,
      }}
      className={cn(
        "absolute min-h-32 cursor-move rounded-lg border bg-white p-3 shadow-[0_2px_6px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-[box-shadow,border-color,transform] duration-300 ease-out dark:bg-neutral-900 dark:shadow-[0_4px_20px_rgba(0,0,0,0.45)]",
        isExpanded && "z-10 scale-[1.02] border-neutral-900 shadow-[0_4px_10px_rgba(0,0,0,0.1),0_16px_40px_rgba(0,0,0,0.18)] dark:border-neutral-100 dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)]",
        !isExpanded &&
          "border-transparent hover:border-neutral-300 hover:shadow-[0_4px_10px_rgba(0,0,0,0.1),0_12px_32px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_6px_28px_rgba(0,0,0,0.55)]"
      )}
    >
      {isExpanded && canEdit && (
        <button
          type="button"
          aria-label="แก้ไขข้อความ"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onEdit()
          }}
          className={cn(
            "absolute top-2 right-2 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-neutral-200 bg-white/95 text-neutral-600 shadow-sm transition-all duration-200 hover:bg-neutral-50 hover:text-neutral-900 active:scale-95 dark:border-neutral-700 dark:bg-neutral-800/95 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-100",
            isExpanded
              ? "translate-y-0 opacity-100 delay-100"
              : "pointer-events-none translate-y-1 opacity-0"
          )}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}

      <div className="mb-2 flex items-center gap-2 border-b border-neutral-200/80 pb-2 pe-8">
        {block.author.avatarUrl ? (
          <img
            src={block.author.avatarUrl}
            alt=""
            className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-neutral-200"
          />
        ) : (
          <div className="h-7 w-7 shrink-0 rounded-full bg-neutral-200" />
        )}
        <span className="truncate text-xs font-medium text-neutral-600 dark:text-neutral-400">
          {block.author.displayName}
        </span>
      </div>

      <div className="flex min-h-16 flex-col items-center justify-center px-1">
        <p className="w-full text-center leading-snug whitespace-pre-wrap break-words select-none">
          {block.text || (
            <span className="text-neutral-400">ยังไม่มีข้อความ</span>
          )}
        </p>
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows,margin-top,opacity] duration-300 ease-out",
          isExpanded
            ? "mt-2.5 grid-rows-[1fr] opacity-100"
            : "mt-0 grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-neutral-200/80 pt-2.5 dark:border-neutral-700/80">
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-neutral-500 dark:text-neutral-400">
              {block.description.trim() || (
                <span className="text-neutral-400 dark:text-neutral-500">
                  ยังไม่มีคำอธิบาย
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function CounterPillRow({
  value,
  valuePop,
  canIncrement,
  canDecrement,
  onIncrement,
  onDecrement,
  className,
}: {
  value: number
  valuePop?: boolean
  canIncrement: boolean
  canDecrement: boolean
  onIncrement: () => void
  onDecrement: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        "counter-pill flex h-10 w-full items-center rounded-full border-2 border-blue-500 bg-white p-[3px]",
        className
      )}
    >
      <button
        type="button"
        data-counter-control
        disabled={!canDecrement}
        aria-label="ยกเลิกการกด +"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation()
          if (canDecrement) onDecrement()
        }}
        className={cn(
          "counter-pill-btn counter-pill-btn-minus flex aspect-square h-full shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50/90 text-blue-600",
          canDecrement
            ? "cursor-pointer hover:border-blue-400 hover:bg-blue-100 active:scale-[0.92]"
            : "cursor-not-allowed opacity-35"
        )}
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={2.75} />
      </button>

      <span
        className={cn(
          "counter-value min-w-[1.5rem] flex-1 px-1 text-center text-lg font-bold tabular-nums text-blue-900",
          valuePop && "counter-value-pop"
        )}
      >
        {value}
      </span>

      <button
        type="button"
        data-counter-control
        disabled={!canIncrement}
        aria-label="เพิ่มค่า"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation()
          if (canIncrement) onIncrement()
        }}
        className={cn(
          "counter-pill-btn counter-pill-btn-plus flex aspect-square h-full shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50/90 text-blue-600",
          canIncrement
            ? "cursor-pointer hover:border-blue-400 hover:bg-blue-100 active:scale-[0.92]"
            : "cursor-not-allowed opacity-35"
        )}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.75} />
      </button>
    </div>
  )
}

function CounterBlock({
  block,
  isExpanded,
  canEdit,
  userStudentId,
  onPointerDown,
  onPointerUp,
  onSelect,
  onEdit,
  onMeasure,
  onIncrement,
  onDecrement,
}: {
  block: BoardCounterBlock
  isExpanded: boolean
  canEdit: boolean
  userStudentId?: string
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void
  onSelect: () => void
  onEdit: () => void
  onMeasure: (height: number) => void
  onIncrement: () => void
  onDecrement: () => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const pillAnchorRef = useRef<HTMLDivElement>(null)
  const [valuePop, setValuePop] = useState(false)
  const skipValuePopRef = useRef(true)
  const displayName = block.name.trim() || "ตัวนับ"
  const hasUserVoted = counterUserHasVoted(block, userStudentId)
  const canIncrement = canEdit && !hasUserVoted
  const canDecrement = canEdit && hasUserVoted

  useEffect(() => {
    if (skipValuePopRef.current) {
      skipValuePopRef.current = false
      return
    }
    setValuePop(true)
    const timer = window.setTimeout(() => setValuePop(false), 360)
    return () => window.clearTimeout(timer)
  }, [block.value])

  useLayoutEffect(() => {
    const element = pillAnchorRef.current
    if (!element) return

    const report = () => onMeasure(element.offsetHeight)
    report()

    const observer = new ResizeObserver(report)
    observer.observe(element)
    return () => observer.disconnect()
  }, [onMeasure, block.name])

  return (
    <div
      ref={rootRef}
      data-block={block.id}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onSelect}
      style={{
        left: `${block.x * 100}%`,
        top: `${block.y * 100}%`,
        width: `${DEFAULT_COUNTER_WIDTH * 100}%`,
      }}
      className={cn(
        "absolute cursor-move select-none transition-transform duration-300 ease-out",
        isExpanded && "z-10 scale-[1.02]"
      )}
    >
      <div
        ref={pillAnchorRef}
        data-counter-pill-anchor
        className={cn(
          "relative flex w-full flex-col items-center gap-1",
          isExpanded && "counter-pill-expanded"
        )}
      >
        {isExpanded && canEdit && (
          <button
            type="button"
            aria-label="แก้ไขตัวนับ"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              onEdit()
            }}
            className="absolute -top-1 -right-1 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-blue-500 bg-white text-blue-600 shadow-sm transition-all duration-200 hover:bg-blue-50 active:scale-95"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}

        <p className="counter-name-label max-w-full truncate px-1 text-center text-[11px] leading-tight font-semibold text-blue-700">
          {displayName}
        </p>

        <CounterPillRow
          value={block.value}
          valuePop={valuePop}
          canIncrement={canIncrement}
          canDecrement={canDecrement}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
          className="w-full"
        />
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows,margin-top,opacity] duration-300 ease-out",
          isExpanded && block.increments.length > 0
            ? "mt-2 grid-rows-[1fr] opacity-100"
            : "mt-0 grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="counter-list-panel rounded-xl border border-blue-200 bg-white px-3 py-2 shadow-sm">
            <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-blue-600 uppercase">
              กด + โดย
            </p>
            <ul className="max-h-24 space-y-1 overflow-y-auto">
              {[...block.increments].reverse().map((entry, index) => (
                <li
                  key={entry.id}
                  className="counter-list-item flex items-center gap-2 text-xs text-neutral-700"
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  {entry.user.avatarUrl ? (
                    <img
                      src={entry.user.avatarUrl}
                      alt=""
                      className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-blue-100"
                    />
                  ) : (
                    <div className="h-5 w-5 shrink-0 rounded-full bg-blue-100" />
                  )}
                  <span className="min-w-0 truncate font-medium">
                    {entry.user.displayName}
                  </span>
                  <span className="ms-auto shrink-0 text-[10px] text-neutral-400">
                    {new Intl.DateTimeFormat("th-TH", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(entry.at))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function CommentEntryRow({
  entry,
  canViewIdentity,
  imageClassName,
}: {
  entry: BoardCommentEntry
  canViewIdentity: boolean
  imageClassName?: string
}) {
  const showIdentity = canViewIdentity && Boolean(entry.user?.displayName)

  return (
    <div className="flex gap-2.5 rounded-lg bg-neutral-50 px-2.5 py-2 dark:bg-neutral-800/80">
      {showIdentity && entry.user?.avatarUrl ? (
        <img
          src={entry.user.avatarUrl}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-neutral-200"
        />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-500 dark:bg-neutral-700">
          <User className="h-4 w-4" strokeWidth={2.25} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        {showIdentity && entry.user && (
          <p className="mb-0.5 truncate text-xs font-semibold text-neutral-700 dark:text-neutral-200">
            {entry.user.displayName}
          </p>
        )}
        {entry.text ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-neutral-800 dark:text-neutral-100">
            {entry.text}
          </p>
        ) : null}
        {entry.imageDataUrl && (
          <img
            src={entry.imageDataUrl}
            alt=""
            className={cn(
              "mt-2 w-full rounded-lg border border-neutral-200 object-cover dark:border-neutral-700",
              imageClassName ?? "max-h-40"
            )}
          />
        )}
        <p className="mt-1 text-[10px] text-neutral-400">
          {new Intl.DateTimeFormat("th-TH", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(new Date(entry.at))}
        </p>
      </div>
    </div>
  )
}

function CommentComposer({
  draft,
  imagePreview,
  imageError,
  isSubmitting,
  canComment,
  canViewIdentity,
  fileInputRef,
  onDraftChange,
  onRemoveImage,
  onImagePick,
  onSubmit,
  rows = 2,
}: {
  draft: string
  imagePreview: string | null
  imageError: string | null
  isSubmitting: boolean
  canComment: boolean
  canViewIdentity: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onDraftChange: (value: string) => void
  onRemoveImage: () => void
  onImagePick: (event: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: () => void
  rows?: number
}) {
  if (!canComment) {
    return (
      <p className="text-xs text-neutral-400">เข้าสู่ระบบเพื่อแสดงความคิดเห็น</p>
    )
  }

  return (
    <>
      {imagePreview && (
        <div className="relative mb-2 inline-block">
          <img
            src={imagePreview}
            alt=""
            className="max-h-28 rounded-lg border border-neutral-200 object-cover"
          />
          <button
            type="button"
            aria-label="ลบรูป"
            onClick={onRemoveImage}
            className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      {imageError && <p className="mb-2 text-xs text-red-600">{imageError}</p>}
      <div className="flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="แสดงความคิดเห็น..."
          rows={rows}
          className="min-h-[2.5rem] flex-1 resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              onSubmit()
            }
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={onImagePick}
        />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="แนบรูป"
          title="รูปภาพสูงสุด 512 KB"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          aria-label="ส่งความคิดเห็น"
          disabled={isSubmitting || (!draft.trim() && !imagePreview)}
          onClick={onSubmit}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-1.5 text-[10px] text-neutral-400">
        {canViewIdentity
          ? "รูปภาพสูงสุด 512 KB"
          : "แสดงเป็นนิรนาม · รูปภาพสูงสุด 512 KB"}
      </p>
    </>
  )
}

function CommentBlock({
  block,
  isExpanded,
  canEdit,
  canComment,
  canViewIdentity,
  onPointerDown,
  onPointerUp,
  onSelect,
  onEdit,
  onMeasure,
  onAddComment,
}: {
  block: BoardCommentBlock
  isExpanded: boolean
  canEdit: boolean
  canComment: boolean
  canViewIdentity: boolean
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void
  onSelect: () => void
  onEdit: () => void
  onMeasure: (height: number) => void
  onAddComment: (text: string, imageDataUrl?: string) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState("")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const displayTitle = block.title.trim() || "ความคิดเห็น"

  useEffect(() => {
    if (!isPopupOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsPopupOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isPopupOpen])

  useLayoutEffect(() => {
    const element = anchorRef.current
    if (!element) return

    const report = () => onMeasure(element.offsetHeight)
    report()

    const observer = new ResizeObserver(report)
    observer.observe(element)
    return () => observer.disconnect()
  }, [onMeasure, block.title])

  const submitComment = async () => {
    const text = draft.trim()
    if (!text && !imagePreview) return
    if (!canComment || isSubmitting) return

    setIsSubmitting(true)
    try {
      onAddComment(text, imagePreview ?? undefined)
      setDraft("")
      setImagePreview(null)
      setImageError(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImagePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setImageError(null)
    try {
      const compressed = await compressCommentImage(file)
      setImagePreview(compressed)
    } catch (error) {
      setImageError(
        error instanceof Error ? error.message : "อัปโหลดรูปไม่สำเร็จ"
      )
    }
  }

  const composerProps = {
    draft,
    imagePreview,
    imageError,
    isSubmitting,
    canComment,
    canViewIdentity,
    fileInputRef,
    onDraftChange: setDraft,
    onRemoveImage: () => setImagePreview(null),
    onImagePick: (event: React.ChangeEvent<HTMLInputElement>) =>
      void handleImagePick(event),
    onSubmit: () => void submitComment(),
  }

  const commentList =
    block.comments.length === 0 ? (
      <p className="py-6 text-center text-xs text-neutral-400">
        ยังไม่มีความคิดเห็น
      </p>
    ) : (
      block.comments.map((entry) => (
        <CommentEntryRow
          key={entry.id}
          entry={entry}
          canViewIdentity={canViewIdentity}
          imageClassName={isPopupOpen ? "max-h-72" : undefined}
        />
      ))
    )

  return (
    <div
      ref={rootRef}
      data-block={block.id}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onSelect}
      style={{
        left: `${block.x * 100}%`,
        top: `${block.y * 100}%`,
        width: `${DEFAULT_COMMENT_WIDTH * 100}%`,
        color: block.color,
        fontSize: block.fontSize,
      }}
      className={cn(
        "absolute cursor-move select-none transition-transform duration-300 ease-out",
        isExpanded && "z-10 scale-[1.02]"
      )}
    >
      <div
        ref={anchorRef}
        data-comment-block-anchor
        className={cn(
          "relative rounded-lg border bg-white p-3 shadow-[0_2px_6px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-[box-shadow,border-color] duration-300 dark:bg-neutral-900",
          isExpanded
            ? "border-neutral-900 dark:border-neutral-100"
            : "border-transparent hover:border-neutral-300"
        )}
      >
        {isExpanded && canEdit && (
          <button
            type="button"
            aria-label="แก้ไขหัวข้อ"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              onEdit()
            }}
            className="absolute top-2 right-2 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-neutral-200 bg-white/95 text-neutral-600 shadow-sm transition-all hover:bg-neutral-50 active:scale-95 dark:border-neutral-700 dark:bg-neutral-800/95"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}

        <div className="mb-2 flex items-center gap-2 border-b border-neutral-200/80 pb-2 pe-8">
          {block.author.avatarUrl ? (
            <img
              src={block.author.avatarUrl}
              alt=""
              className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-neutral-200"
            />
          ) : (
            <div className="h-7 w-7 shrink-0 rounded-full bg-neutral-200" />
          )}
          <span className="truncate text-xs font-medium text-neutral-600 dark:text-neutral-400">
            {block.author.displayName}
          </span>
        </div>

        <div className="flex min-h-16 flex-col items-center justify-center px-1">
          <p className="w-full text-center leading-snug whitespace-pre-wrap break-words">
            {block.title.trim() || (
              <span className="text-neutral-400">ความคิดเห็น</span>
            )}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows,margin-top,opacity] duration-300 ease-out",
          isExpanded ? "mt-2 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div
            data-comment-control
            className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-neutral-500">
                {block.comments.length} ความคิดเห็น
              </span>
              <button
                type="button"
                aria-label="ขยายความคิดเห็นเต็มหน้าจอ"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation()
                  setIsPopupOpen(true)
                }}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="max-h-52 space-y-2.5 overflow-y-auto pe-1">
              {commentList}
            </div>

            {!isPopupOpen && (
              <div className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-700">
                <CommentComposer {...composerProps} />
              </div>
            )}
          </div>
        </div>
      </div>

      {isPopupOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`comment-popup-title-${block.id}`}
            data-comment-control
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              if (event.target === event.currentTarget) setIsPopupOpen(false)
            }}
          >
            <div
              className="flex max-h-[min(720px,90vh)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200 dark:border-neutral-700 dark:bg-neutral-900"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
                <div className="min-w-0">
                  <h2
                    id={`comment-popup-title-${block.id}`}
                    className="truncate text-lg font-semibold text-neutral-900 dark:text-neutral-100"
                  >
                    {displayTitle}
                  </h2>
                  <p className="mt-0.5 text-sm text-neutral-500">
                    {block.comments.length} ความคิดเห็น
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="ปิด"
                  onClick={() => setIsPopupOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
                {commentList}
              </div>

              <div className="border-t border-neutral-200 px-5 py-4 dark:border-neutral-800">
                <CommentComposer {...composerProps} rows={3} />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

export default function AnnouncementBoardPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const announcementId = params.id
  const { user, ready: authorReady } = useCurrentUser()

  const viewportRef = useRef<HTMLDivElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const panDragRef = useRef<PanDrag | null>(null)
  const blockDragRef = useRef<BlockDrag | null>(null)
  const panRef = useRef<Point>({ x: 0, y: 0 })
  const zoomRef = useRef(DEFAULT_ZOOM)
  const viewportSizeRef = useRef<Size>({ width: 0, height: 0 })
  const blocksRef = useRef<BoardBlock[]>([])
  const connectionsRef = useRef<BoardConnection[]>([])
  const blockHeightsRef = useRef<Record<string, number>>({})

  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 })
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [blocks, setBlocks] = useState<BoardBlock[]>([])
  const [connections, setConnections] = useState<BoardConnection[]>([])
  const [blockHeights, setBlockHeights] = useState<Record<string, number>>({})
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPanelEditing, setIsPanelEditing] = useState(false)
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null)
  const [title, setTitle] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [boardExists, setBoardExists] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [collapsedLinkIds, setCollapsedLinkIds] = useState<Set<string>>(() => new Set())
  const [isPanning, setIsPanning] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [componentMenuOpen, setComponentMenuOpen] = useState(false)
  const [dockDropPending, setDockDropPending] = useState<{
    dockId: string
    blockId: string
    connectionIds: string[]
  } | null>(null)
  const [dockHoverId, setDockHoverId] = useState<string | null>(null)
  const [dockedOutIds, setDockedOutIds] = useState<Set<string>>(() => new Set())
  const [dockOutHidden, setDockOutHidden] = useState<Set<string>>(() => new Set())
  const componentMenuRef = useRef<HTMLDivElement>(null)
  const selectedIdRef = useRef<string | null>(null)
  const hasCenteredRef = useRef(false)

  panRef.current = pan
  zoomRef.current = zoom
  blocksRef.current = blocks
  connectionsRef.current = connections
  blockHeightsRef.current = blockHeights
  viewportSizeRef.current = viewport
  selectedIdRef.current = selectedId

  const dockedBlockIds = useMemo(() => collectDockedBlockIds(blocks), [blocks])
  const dockedOutIdsRef = useRef(dockedOutIds)
  dockedOutIdsRef.current = dockedOutIds
  const dockOutHiddenRef = useRef(dockOutHidden)
  dockOutHiddenRef.current = dockOutHidden

  const toggleDockedOut = useCallback((dockId: string, blockId: string) => {
    const currentBlocks = blocksRef.current
    const currentConnections = connectionsRef.current
    const dock = currentBlocks.find(
      (block): block is BoardDockBlock =>
        block.id === dockId && isDockBlock(block)
    )
    const block = currentBlocks.find((item) => item.id === blockId)
    if (!dock || !block) return

    const isOut = dockedOutIdsRef.current.has(blockId)

    if (isOut) {
      setDockedOutIds((current) => {
        const next = new Set(current)
        next.delete(blockId)
        return next
      })
      setExpandedIds((current) => {
        if (!current.has(blockId)) return current
        const next = new Set(current)
        next.delete(blockId)
        return next
      })
      setIsDirty(true)
      return
    }

    const outIndex = dock.dockedBlockIds.filter((id) =>
      dockedOutIdsRef.current.has(id)
    ).length
    const position = computeDockOutPosition(dock, block, outIndex)

    setBlocks((current) =>
      current.map((item) =>
        item.id === blockId ? { ...item, x: position.x, y: position.y } : item
      )
    )
    setDockedOutIds((current) => new Set([...current, blockId]))
    setExpandedIds((current) => new Set([...current, blockId]))
    if (!dockConnectionExists(currentConnections, dockId, blockId)) {
      setConnections((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          fromId: dockId,
          toId: blockId,
          createdAt: new Date().toISOString(),
        },
      ])
    }
    setDockOutHidden((current) => {
      if (!current.has(dockId)) return current
      const next = new Set(current)
      next.delete(dockId)
      return next
    })
    setIsDirty(true)
  }, [])

  const toggleDockOutVisibility = useCallback((dockId: string) => {
    setDockOutHidden((current) => {
      const next = new Set(current)
      if (next.has(dockId)) next.delete(dockId)
      else next.add(dockId)
      return next
    })
  }, [])

  const blocksById = useMemo(() => {
    const map = new Map<string, BoardBlock>()
    for (const block of blocks) map.set(block.id, block)
    return map
  }, [blocks])

  const boardRenderBlocks = useMemo(() => {
    const docks: BoardBlock[] = []
    const others: BoardBlock[] = []
    for (const block of blocks) {
      if (isDockBlock(block)) docks.push(block)
      else others.push(block)
    }
    return [...docks, ...others]
  }, [blocks])

  useEffect(() => {
    const element = viewportRef.current
    if (!element) return

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setViewport({ width, height })
      setPan((current) => clampPan(current, { width, height }, zoomRef.current))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (viewport.width === 0 || viewport.height === 0) return
    if (hasCenteredRef.current) return
    hasCenteredRef.current = true
    setPan(centerPan(viewport, zoomRef.current))
  }, [viewport])

  const applyZoom = useCallback((nextZoom: number) => {
    const clampedZoom = clampZoom(nextZoom)
    const viewportSize = viewportSizeRef.current
    const anchor = viewportCenter(viewportSize)

    setPan((currentPan) =>
      clampPan(
        zoomAtPoint(currentPan, zoomRef.current, clampedZoom, anchor),
        viewportSize,
        clampedZoom
      )
    )
    setZoom(clampedZoom)
  }, [])

  const resetView = useCallback(() => {
    const viewportSize = viewportSizeRef.current
    setZoom(DEFAULT_ZOOM)
    setPan(centerPan(viewportSize, DEFAULT_ZOOM))
  }, [])

  useEffect(() => {
    const element = viewportRef.current
    if (!element) return

    const onWheel = (event: WheelEvent) => {
      if ((event.target as HTMLElement).closest("[data-board-panel]")) return

      event.preventDefault()
      const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08
      applyZoom(zoomRef.current * factor)
    }

    element.addEventListener("wheel", onWheel, { passive: false })
    return () => element.removeEventListener("wheel", onWheel)
  }, [applyZoom])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      try {
        const record = await fetchBoard(announcementId)
        if (!cancelled) {
          if (record) {
            const content = recordToBoardContent(record)
            setBlocks(content.blocks)
            setConnections(content.connections)
            setExpandedIds(new Set(content.blocks.map((block) => block.id)))
            setSavedAt(content.updatedAt)
            setBoardExists(true)
          } else {
            setBlocks([])
            setConnections([])
            setSavedAt(null)
            setBoardExists(false)
          }
          setIsDirty(false)
        }
      } catch {
        if (!cancelled) {
          setBlocks([])
          setConnections([])
          setSavedAt(null)
          setBoardExists(false)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }

      try {
        const record = await fetchAnnouncement(announcementId)
        if (!cancelled && record) setTitle(record.name)
      } catch {
        // Title is decorative — the board still works without it.
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [announcementId])

  useEffect(() => {
    if (!componentMenuOpen) return

    const onPointerDown = (event: PointerEvent) => {
      if (!componentMenuRef.current?.contains(event.target as Node)) {
        setComponentMenuOpen(false)
      }
    }

    window.addEventListener("pointerdown", onPointerDown)
    return () => window.removeEventListener("pointerdown", onPointerDown)
  }, [componentMenuOpen])

  const updateBlock = useCallback((id: string, patch: Partial<BoardBlock>) => {
    setBlocks((current) =>
      current.map((block) =>
        block.id === id ? ({ ...block, ...patch } as BoardBlock) : block
      )
    )
    setIsDirty(true)
  }, [])

  const reportBlockHeight = useCallback((id: string, height: number) => {
    setBlockHeights((current) => {
      if (current[id] === height) return current
      return { ...current, [id]: height }
    })
  }, [])

  const pruneEmptyBlock = useCallback((id: string | null) => {
    if (!id) return
    const block = blocksRef.current.find((item) => item.id === id)
    if (!block || !isTextBlock(block) || block.text.trim().length > 0) return

    setBlocks((current) => current.filter((item) => item.id !== id))
    setConnections((current) =>
      current.filter(
        (connection) => connection.fromId !== id && connection.toId !== id
      )
    )
    setBlockHeights((current) => {
      if (!(id in current)) return current
      const next = { ...current }
      delete next[id]
      return next
    })
    setIsDirty(true)
  }, [])

  const expandedIdsRef = useRef(expandedIds)
  expandedIdsRef.current = expandedIds

  const expandBlock = useCallback((id: string) => {
    setExpandedIds((current) => {
      if (current.has(id)) return current
      const next = new Set(current)
      next.add(id)
      return next
    })
  }, [])

  const toggleBlockExpanded = useCallback((id: string) => {
    const wasExpanded = expandedIdsRef.current.has(id)
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    return !wasExpanded
  }, [])

  const openPanel = useCallback((id: string, edit: boolean) => {
    const previous = selectedIdRef.current
    if (previous && previous !== id) pruneEmptyBlock(previous)
    expandBlock(id)
    setSelectedId(id)
    setIsPanelEditing(edit)
    setDeleteConfirmOpen(false)
  }, [expandBlock, pruneEmptyBlock])

  const closePanel = useCallback(() => {
    const previous = selectedIdRef.current
    if (previous) pruneEmptyBlock(previous)
    setSelectedId(null)
    setIsPanelEditing(false)
    setDeleteConfirmOpen(false)
  }, [pruneEmptyBlock])

  const deleteBlock = useCallback((id: string) => {
    setBlocks((current) =>
      current
        .filter((block) => block.id !== id)
        .map((block) => {
          if (isDockBlock(block)) {
            return {
              ...block,
              dockedBlockIds: block.dockedBlockIds.filter((dId) => dId !== id),
              snapToId: block.snapToId === id ? null : block.snapToId,
              snapSide: block.snapToId === id ? null : block.snapSide,
            }
          }
          return block
        })
    )
    setConnections((current) =>
      current.filter(
        (connection) => connection.fromId !== id && connection.toId !== id
      )
    )
    setSelectedId((current) => (current === id ? null : current))
    setExpandedIds((current) => {
      if (!current.has(id)) return current
      const next = new Set(current)
      next.delete(id)
      return next
    })
    setConnectingFromId((current) => (current === id ? null : current))
    setBlockHeights((current) => {
      if (!(id in current)) return current
      const next = { ...current }
      delete next[id]
      return next
    })
    setDockedOutIds((current) => {
      const deleted = blocksRef.current.find((block) => block.id === id)
      const next = new Set(current)
      let changed = false
      if (next.delete(id)) changed = true
      if (deleted && isDockBlock(deleted)) {
        for (const dockedId of deleted.dockedBlockIds) {
          if (next.delete(dockedId)) changed = true
        }
      }
      return changed ? next : current
    })
    setIsDirty(true)
  }, [])

  const disconnectConnection = useCallback((connectionId: string) => {
    setConnections((current) =>
      current.filter((connection) => connection.id !== connectionId)
    )
    setIsDirty(true)
  }, [])

  const dockBlockInto = useCallback(
    (dockId: string, blockId: string, disconnectAll: boolean) => {
      if (disconnectAll) {
        setConnections((current) =>
          current.filter(
            (connection) =>
              connection.fromId !== blockId && connection.toId !== blockId
          )
        )
      }
      setBlocks((current) =>
        current.map((block) => {
          if (!isDockBlock(block)) return block
          const without = block.dockedBlockIds.filter((id) => id !== blockId)
          if (block.snapToId === blockId) {
            return {
              ...block,
              dockedBlockIds: without,
              snapToId: null,
              snapSide: null,
            }
          }
          if (block.id === dockId) {
            return { ...block, dockedBlockIds: [...without, blockId] }
          }
          return { ...block, dockedBlockIds: without }
        })
      )
      setDockedOutIds((current) => {
        if (!current.has(blockId)) return current
        const next = new Set(current)
        next.delete(blockId)
        return next
      })
      setDockDropPending(null)
      setDockHoverId(null)
      setIsDirty(true)
    },
    []
  )

  const undockBlock = useCallback((dockId: string, blockId: string) => {
    const dock = blocksRef.current.find(
      (block): block is BoardDockBlock =>
        block.id === dockId && isDockBlock(block)
    )
    const block = blocksRef.current.find((item) => item.id === blockId)
    const spawn =
      dock && block
        ? computeDockOutPosition(
            dock,
            block,
            dock.dockedBlockIds.indexOf(blockId)
          )
        : { x: 0.1, y: 0.1 }

    setBlocks((current) =>
      current.map((item) => {
        if (isDockBlock(item) && item.id === dockId) {
          return {
            ...item,
            dockedBlockIds: item.dockedBlockIds.filter((id) => id !== blockId),
          }
        }
        if (item.id === blockId) {
          return { ...item, x: spawn.x, y: spawn.y }
        }
        return item
      })
    )
    setConnections((current) =>
      current.filter(
        (connection) =>
          !(
            (connection.fromId === dockId && connection.toId === blockId) ||
            (connection.fromId === blockId && connection.toId === dockId)
          )
      )
    )
    setDockedOutIds((current) => {
      if (!current.has(blockId)) return current
      const next = new Set(current)
      next.delete(blockId)
      return next
    })
    setIsDirty(true)
  }, [])

  const addTextBlock = useCallback(() => {
    // Drop the new block near the middle of whatever part of the board is visible.
    const centerX = (-pan.x + viewport.width / 2) / (BOARD_WIDTH * zoom)
    const centerY = (-pan.y + viewport.height / 2) / (BOARD_HEIGHT * zoom)
    const block = createTextBlock(clamp(centerX - 0.05, 0, 0.9), clamp(centerY - 0.03, 0, 0.94), {
      studentId: user?.studentId ?? "ไม่ระบุ",
      displayName: user?.displayName ?? "ผู้เยี่ยมชม",
      avatarUrl: user?.avatarUrl,
    })

    setBlocks((current) => [...current, block])
    setExpandedIds((current) => new Set([...current, block.id]))
    openPanel(block.id, true)
    setIsDirty(true)
  }, [pan, viewport, user, openPanel, zoom])

  const addCounterBlock = useCallback(() => {
    const centerX = (-pan.x + viewport.width / 2) / (BOARD_WIDTH * zoom)
    const centerY = (-pan.y + viewport.height / 2) / (BOARD_HEIGHT * zoom)
    const block = createCounterBlock(
      clamp(centerX - 0.05, 0, 0.9),
      clamp(centerY - 0.02, 0, 0.94),
      {
        studentId: user?.studentId ?? "ไม่ระบุ",
        displayName: user?.displayName ?? "ผู้เยี่ยมชม",
        avatarUrl: user?.avatarUrl,
      }
    )

    setBlocks((current) => [...current, block])
    setExpandedIds((current) => new Set([...current, block.id]))
    openPanel(block.id, true)
    setIsDirty(true)
    setComponentMenuOpen(false)
  }, [pan, viewport, user, openPanel, zoom])

  const addCommentBlock = useCallback(() => {
    const centerX = (-pan.x + viewport.width / 2) / (BOARD_WIDTH * zoom)
    const centerY = (-pan.y + viewport.height / 2) / (BOARD_HEIGHT * zoom)
    const block = createCommentBlock(
      clamp(centerX - 0.05, 0, 0.9),
      clamp(centerY - 0.03, 0, 0.94),
      {
        studentId: user?.studentId ?? "ไม่ระบุ",
        displayName: user?.displayName ?? "ผู้เยี่ยมชม",
        avatarUrl: user?.avatarUrl,
      }
    )

    setBlocks((current) => [...current, block])
    setExpandedIds((current) => new Set([...current, block.id]))
    openPanel(block.id, true)
    setIsDirty(true)
    setComponentMenuOpen(false)
  }, [pan, viewport, user, openPanel, zoom])

  const addLinkBlock = useCallback(() => {
    const centerX = (-pan.x + viewport.width / 2) / (BOARD_WIDTH * zoom)
    const centerY = (-pan.y + viewport.height / 2) / (BOARD_HEIGHT * zoom)
    const nodeW = DEFAULT_LINK_WIDTH
    const nodeH = LINK_NODE_SIZE / BOARD_HEIGHT
    const block = createLinkBlock(
      clamp(centerX - nodeW / 2, 0, 1 - nodeW),
      clamp(centerY - nodeH / 2, 0, 1 - nodeH),
      {
        studentId: user?.studentId ?? "ไม่ระบุ",
        displayName: user?.displayName ?? "ผู้เยี่ยมชม",
        avatarUrl: user?.avatarUrl,
      }
    )

    setBlocks((current) => [...current, block])
    setCollapsedLinkIds((current) => new Set([...current, block.id]))
    openPanel(block.id, true)
    setIsDirty(true)
    setComponentMenuOpen(false)
  }, [pan, viewport, user, openPanel, zoom])

  const addDockBlock = useCallback(() => {
    const centerX = (-pan.x + viewport.width / 2) / (BOARD_WIDTH * zoom)
    const centerY = (-pan.y + viewport.height / 2) / (BOARD_HEIGHT * zoom)
    const block = createDockBlock(
      clamp(centerX - DEFAULT_DOCK_WIDTH / 2, 0, 1 - DEFAULT_DOCK_WIDTH),
      clamp(centerY - 0.05, 0, 0.94),
      {
        studentId: user?.studentId ?? "ไม่ระบุ",
        displayName: user?.displayName ?? "ผู้เยี่ยมชม",
        avatarUrl: user?.avatarUrl,
      }
    )

    setBlocks((current) => [...current, block])
    setExpandedIds((current) => new Set([...current, block.id]))
    openPanel(block.id, false)
    setIsDirty(true)
    setComponentMenuOpen(false)
  }, [pan, viewport, user, openPanel, zoom])

  const appendComment = useCallback(
    (blockId: string, text: string, imageDataUrl?: string) => {
      if (!user) return
      const trimmed = text.trim()
      if (!trimmed && !imageDataUrl) return

      setBlocks((current) =>
        current.map((block) => {
          if (block.id !== blockId || !isCommentBlock(block)) return block
          return {
            ...block,
            comments: [
              ...block.comments,
              {
                id: crypto.randomUUID(),
                text: trimmed,
                imageDataUrl,
                user: {
                  studentId: user.studentId,
                  displayName: user.displayName,
                  avatarUrl: user.avatarUrl,
                },
                at: new Date().toISOString(),
              },
            ],
          }
        })
      )
      setIsDirty(true)
    },
    [user]
  )

  const adjustCounter = useCallback(
    (blockId: string, delta: 1 | -1) => {
      if (!user) return
      setBlocks((current) =>
        current.map((block) => {
          if (block.id !== blockId || !isCounterBlock(block)) return block
          if (!canEditBlock(block, user)) return block

          const hasVoted = counterUserHasVoted(block, user.studentId)

          if (delta > 0) {
            if (hasVoted) return block
            const increments = [
              ...block.increments,
              {
                id: crypto.randomUUID(),
                user: {
                  studentId: user.studentId,
                  displayName: user.displayName,
                  avatarUrl: user.avatarUrl,
                },
                at: new Date().toISOString(),
              },
            ]
            return { ...block, value: increments.length, increments }
          }

          if (!hasVoted) return block
          const increments = block.increments.filter(
            (entry) => entry.user.studentId !== user.studentId
          )
          return { ...block, value: increments.length, increments }
        })
      )
      setIsDirty(true)
    },
    [user]
  )

  const selectBlock = useCallback(
    (id: string) => {
      if (!connectingFromId) {
        const nowExpanded = toggleBlockExpanded(id)
        if (!nowExpanded && selectedIdRef.current === id) {
          closePanel()
        } else if (
          nowExpanded &&
          selectedIdRef.current &&
          selectedIdRef.current !== id
        ) {
          closePanel()
        }
        return
      }

      if (connectingFromId === id) {
        setConnectingFromId(null)
        openPanel(id, false)
        return
      }

      const fromBlock = blocksRef.current.find(
        (item) => item.id === connectingFromId
      )
      const toBlock = blocksRef.current.find((item) => item.id === id)
      if (
        !fromBlock ||
        !toBlock ||
        !isValidConnectionEndpoints(fromBlock, toBlock)
      ) {
        setConnectingFromId(null)
        return
      }

      setConnections((current) => {
        const alreadyConnected = current.some(
          (connection) =>
            (connection.fromId === connectingFromId && connection.toId === id) ||
            (connection.fromId === id && connection.toId === connectingFromId)
        )
        if (alreadyConnected) return current

        return [
          ...current,
          {
            id: crypto.randomUUID(),
            fromId: connectingFromId,
            toId: id,
            createdAt: new Date().toISOString(),
          },
        ]
      })
      setConnectingFromId(null)
      openPanel(id, false)
      setIsDirty(true)
    },
    [connectingFromId, toggleBlockExpanded, openPanel, closePanel]
  )

  const openBlockEditor = useCallback(
    (id: string) => {
      openPanel(id, true)
    },
    [openPanel]
  )

  const blockClickRef = useRef<{ blockId: string; moved: boolean } | null>(null)

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setSaveError(null)
    try {
      const input = {
        announcementId,
        blocks: normalizeBoardBlocksForSave(blocks),
        connections,
      }
      const record = boardExists
        ? await updateBoard(input)
        : await createBoard(input)
      setSavedAt(record.updated_at)
      setBoardExists(true)
      setIsDirty(false)
    } catch (error) {
      setSaveError(boardSaveErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }, [announcementId, blocks, connections, boardExists])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return
      if (event.key === "Escape") {
        closePanel()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [closePanel])

  useEffect(() => {
    if (!selectedId || !isPanelEditing) return
    const block = blocks.find((item) => item.id === selectedId)
    if (!block) return
    if (isCommentBlock(block)) {
      if (block.title.trim()) return
    } else if (isLinkBlock(block)) {
      if (block.name.trim()) return
    } else if (!isTextBlock(block) || block.text.trim()) {
      return
    }
    messageRef.current?.focus()
  }, [selectedId, isPanelEditing, blocks])

  const toggleLinkReveal = useCallback((blockId: string) => {
    setCollapsedLinkIds((current) => {
      const next = new Set(current)
      if (next.has(blockId)) next.delete(blockId)
      else next.add(blockId)
      return next
    })
  }, [])

  const activateLinkBlock = useCallback(
    (block: BoardLinkBlock) => {
      if (
        blockClickRef.current?.blockId === block.id &&
        blockClickRef.current.moved
      ) {
        return
      }
      if (connectingFromId) {
        selectBlock(block.id)
        return
      }
      toggleLinkReveal(block.id)
      openPanel(block.id, canEditBlock(block, user))
    },
    [connectingFromId, selectBlock, toggleLinkReveal, openPanel, user]
  )

  const startBlockDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    block: BoardBlock
  ) => {
    if ((event.target as HTMLElement).closest("[data-counter-control]")) return
    if ((event.target as HTMLElement).closest("[data-comment-control]")) return
    if ((event.target as HTMLElement).closest("[data-dock-control]")) return
    event.stopPropagation()

    const element = event.currentTarget
    const anchorEl =
      (element.querySelector("[data-counter-pill-anchor]") as HTMLElement | null) ??
      (element.querySelector("[data-comment-block-anchor]") as HTMLElement | null) ??
      (element.querySelector("[data-link-node-anchor]") as HTMLElement | null) ??
      (element.querySelector("[data-dock-block-anchor]") as HTMLElement | null)
    const measureEl = anchorEl ?? element

    element.setPointerCapture(event.pointerId)
    blockDragRef.current = {
      pointerId: event.pointerId,
      blockId: block.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: block.x,
      originY: block.y,
      heightFraction: measureEl.offsetHeight / BOARD_HEIGHT,
      moved: false,
    }
    blockClickRef.current = { blockId: block.id, moved: false }
  }

  const endPointer = useCallback((event: ReactPointerEvent | PointerEvent) => {
    const pointerId = event.pointerId

    if (blockDragRef.current?.pointerId === pointerId) {
      const drag = blockDragRef.current
      const block = blocksRef.current.find((item) => item.id === drag.blockId)

      if (block && drag.moved && !isDockBlock(block)) {
        const current = blocksRef.current.find((item) => item.id === block.id)
        if (current) {
          const targetDock = findDockDropTarget(
            current,
            current.x,
            current.y,
            drag.heightFraction,
            blocksRef.current,
            blockHeightsRef.current
          )
          if (targetDock && !targetDock.dockedBlockIds.includes(current.id)) {
            const related = connectionsRef.current.filter(
              (connection) =>
                connection.fromId === current.id || connection.toId === current.id
            )
            if (related.length > 0) {
              setDockDropPending({
                dockId: targetDock.id,
                blockId: current.id,
                connectionIds: related.map((connection) => connection.id),
              })
            } else {
              dockBlockInto(targetDock.id, current.id, false)
            }
          }
        }
      }

      setDockHoverId(null)

      const blockEl = document.querySelector(`[data-block="${drag.blockId}"]`)
      if (blockEl instanceof HTMLElement) {
        try {
          blockEl.releasePointerCapture(pointerId)
        } catch {
          /* not captured */
        }
      }
      blockDragRef.current = null
    }

    if (panDragRef.current?.pointerId === pointerId) {
      try {
        viewportRef.current?.releasePointerCapture(pointerId)
      } catch {
        /* not captured */
      }
      panDragRef.current = null
      setIsPanning(false)
    }
  }, [dockBlockInto])

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const blockDrag = blockDragRef.current
      if (blockDrag?.pointerId === event.pointerId) {
        if (
          Math.hypot(
            event.clientX - blockDrag.startX,
            event.clientY - blockDrag.startY
          ) > 4
        ) {
          blockDrag.moved = true
          if (blockClickRef.current?.blockId === blockDrag.blockId) {
            blockClickRef.current.moved = true
          }
        }

        const scale = BOARD_WIDTH * zoomRef.current
        const nextX =
          blockDrag.originX + (event.clientX - blockDrag.startX) / scale
        const nextY =
          blockDrag.originY + (event.clientY - blockDrag.startY) / (BOARD_HEIGHT * zoomRef.current)
        const block = blocksRef.current.find((item) => item.id === blockDrag.blockId)
        const maxX = 1 - (block ? blockLayoutWidth(block) : 0)
        const maxY = 1 - blockDrag.heightFraction
        const clampedX = clamp(nextX, 0, Math.max(0, maxX))
        const clampedY = clamp(nextY, 0, Math.max(0, maxY))

        if (block && isDockBlock(block)) {
          const snapped = computeDockSnapPosition(
            block,
            clampedX,
            clampedY,
            blocksRef.current,
            blockHeightsRef.current,
            dockedOutIdsRef.current,
            dockOutHiddenRef.current
          )
          updateBlock(blockDrag.blockId, {
            x: clamp(snapped.x, 0, Math.max(0, maxX)),
            y: clamp(snapped.y, 0, Math.max(0, maxY)),
            snapToId: snapped.snapToId,
            snapSide: snapped.snapSide,
          })
          setDockHoverId(null)
          return
        }

        if (block && isTextBlock(block)) {
          setBlocks((current) =>
            current.map((item) => {
              if (item.id === blockDrag.blockId) {
                return { ...item, x: clampedX, y: clampedY }
              }
              if (isDockBlock(item) && item.snapToId === blockDrag.blockId) {
                const dockHeightPx =
                  blockHeightsRef.current[item.id] ?? DEFAULT_DOCK_BLOCK_HEIGHT
                const dockHeightFraction = dockHeightPx / BOARD_HEIGHT
                const below = item.snapSide === "below"
                return {
                  ...item,
                  x: clampedX,
                  y: below
                    ? clampedY +
                      blockDrag.heightFraction +
                      DOCK_SNAP_GAP_FRACTION
                    : clampedY -
                      dockHeightFraction -
                      DOCK_SNAP_GAP_FRACTION,
                }
              }
              return item
            })
          )
          setDockHoverId(null)
          setIsDirty(true)
          return
        }

        if (block && !isDockBlock(block)) {
          const targetDock = findDockDropTarget(
            block,
            clampedX,
            clampedY,
            blockDrag.heightFraction,
            blocksRef.current,
            blockHeightsRef.current
          )
          setDockHoverId(targetDock?.id ?? null)
        } else {
          setDockHoverId(null)
        }

        updateBlock(blockDrag.blockId, {
          x: clampedX,
          y: clampedY,
        })
        return
      }

      const panDrag = panDragRef.current
      if (panDrag?.pointerId !== event.pointerId) return

      setPan(
        clampPan(
          {
            x: panDrag.origin.x + (event.clientX - panDrag.startX),
            y: panDrag.origin.y + (event.clientY - panDrag.startY),
          },
          viewportSizeRef.current,
          zoomRef.current
        )
      )
    },
    [updateBlock]
  )

  useEffect(() => {
    const onWindowPointerMove = (event: PointerEvent) => handlePointerMove(event)
    const onWindowPointerUp = (event: PointerEvent) => endPointer(event)

    window.addEventListener("pointermove", onWindowPointerMove)
    window.addEventListener("pointerup", onWindowPointerUp)
    window.addEventListener("pointercancel", onWindowPointerUp)
    return () => {
      window.removeEventListener("pointermove", onWindowPointerMove)
      window.removeEventListener("pointerup", onWindowPointerUp)
      window.removeEventListener("pointercancel", onWindowPointerUp)
    }
  }, [endPointer, handlePointerMove])

  const handleViewportPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    if ((event.target as HTMLElement).closest("[data-block]")) return
    if ((event.target as HTMLElement).closest("[data-counter-control]")) return
    if ((event.target as HTMLElement).closest("[data-comment-control]")) return
    if ((event.target as HTMLElement).closest("[data-link-node]")) return
    if ((event.target as HTMLElement).closest("[data-board-panel]")) return

    event.preventDefault()
    closePanel()
    viewportRef.current?.setPointerCapture(event.pointerId)
    panDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: panRef.current,
    }
    setIsPanning(true)
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    endPointer(event)
  }

  const selectedBlock = blocks.find((block) => block.id === selectedId) ?? null
  const canEditSelected = selectedBlock ? canEditBlock(selectedBlock, user) : false
  const canAddBlocks = authorReady && Boolean(user)

  const selectedChildBlocks = useMemo(() => {
    if (!selectedBlock) return []
    return connections
      .filter((connection) => connection.fromId === selectedBlock.id)
      .flatMap((connection) => {
        const block = blocks.find((item) => item.id === connection.toId)
        return block ? [{ connectionId: connection.id, block }] : []
      })
  }, [selectedBlock, connections, blocks])

  const selectedParentBlocks = useMemo(() => {
    if (!selectedBlock) return []
    return connections
      .filter((connection) => connection.toId === selectedBlock.id)
      .flatMap((connection) => {
        const block = blocks.find((item) => item.id === connection.fromId)
        return block ? [{ connectionId: connection.id, block }] : []
      })
  }, [selectedBlock, connections, blocks])

  const cancelConnect = useCallback(() => {
    setConnectingFromId(null)
  }, [])

  const handleBackToAnnounces = useCallback(() => {
    if (isDirty) {
      setLeaveConfirmOpen(true)
      return
    }
    router.push("/announces")
  }, [isDirty, router])

  const saveStateLabel = isSaving
    ? "กำลังบันทึก..."
    : saveError
      ? saveError
      : isDirty
        ? "ยังไม่ได้บันทึก"
        : savedAt
          ? `บันทึกแล้ว ${new Date(savedAt).toLocaleTimeString("th-TH")}`
          : "ยังไม่มีการเปลี่ยนแปลง"

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            aria-label="กลับไปหน้าโน้ตประกาศ"
            onClick={handleBackToAnnounces}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-neutral-800 dark:text-neutral-200">
              {title ?? "พื้นที่ทำงาน"}
            </h1>
            <p
              className={cn(
                "text-xs",
                saveError
                  ? "text-red-600 dark:text-red-400"
                  : isDirty
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-neutral-500"
              )}
            >
              {saveStateLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canAddBlocks && (
            <Button
              variant="outline"
              render={<Link href={`/announces?edit=${announcementId}`} />}
              nativeButton={false}
            >
              <Pencil className="me-2 h-4 w-4" />
              แก้ไขบอร์ด
            </Button>
          )}
          {canAddBlocks && (
            <Button type="button" variant="outline" onClick={addTextBlock}>
              <Plus className="me-2 h-4 w-4" />
              เพิ่มข้อความ
            </Button>
          )}
          {canAddBlocks && (
            <div ref={componentMenuRef} className="relative">
              <Button
                type="button"
                variant="outline"
                aria-expanded={componentMenuOpen}
                aria-haspopup="menu"
                onClick={() => setComponentMenuOpen((open) => !open)}
              >
                <Plus className="me-2 h-4 w-4" />
                เพิ่ม Node 
                <ChevronDown className="ms-2 h-4 w-4" />
              </Button>
              {componentMenuOpen && (
                <div
                  role="menu"
                  className="absolute top-full right-0 z-50 mt-1 min-w-[12rem] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={addCounterBlock}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-neutral-800 transition-colors hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-blue-500 bg-white text-xs font-bold text-blue-600">
                      #
                    </span>
                     Node ตัวนับ
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={addCommentBlock}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-neutral-800 transition-colors hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-600">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </span>
                     Node ความคิดเห็น
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={addLinkBlock}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-neutral-800 transition-colors hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-600">
                      <Paperclip className="h-3.5 w-3.5" />
                    </span>
                     Node ลิงก์
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={addDockBlock}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-neutral-800 transition-colors hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-600">
                      <PanelBottom className="h-3.5 w-3.5" />
                    </span>
                     Node ด็อก
                  </button>
                </div>
              )}
            </div>
          )}
          {canAddBlocks && (
            <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              "บันทึก"
            )}
          </Button>
          )}
        </div>
      </header>

      <div
        ref={viewportRef}
        onPointerDown={handleViewportPointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          "relative flex-1 touch-none overflow-hidden bg-white dark:bg-neutral-950",
          isPanning ? "cursor-grabbing" : "cursor-default"
        )}
      >
        {connectingFromId && (
          <div className="absolute top-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-neutral-900 py-2 ps-4 pe-2 text-xs font-medium text-white shadow-lg">
            <span>เลือกข้อความอื่นเพื่อเชื่อมต่อ</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={cancelConnect}
              className="h-7 rounded-full px-3 text-white hover:bg-white/15 hover:text-white"
            >
              ยกเลิก
            </Button>
          </div>
        )}

        <div className="absolute bottom-4 left-4 z-40 flex items-center gap-1 rounded-xl border border-neutral-200 bg-white/95 p-1 shadow-lg backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-900/95">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="ซูมออก"
            onClick={() => applyZoom(zoom / 1.2)}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <button
            type="button"
            onClick={() => resetView()}
            className="min-w-12 rounded-md px-2 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {Math.round(zoom * 100)}%
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="ซูมเข้า"
            onClick={() => applyZoom(zoom * 1.2)}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div
          data-board-surface
          style={{
            width: BOARD_WIDTH,
            height: BOARD_HEIGHT,
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: "0 0",
            backgroundImage:
              "radial-gradient(circle, rgba(0,0,0,.12) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
          className="absolute top-0 left-0 origin-top-left cursor-default rounded-sm bg-white shadow-inner dark:bg-neutral-950"
        >
          {boardRenderBlocks.map((block) => {
            if (
              dockedBlockIds.has(block.id) &&
              !isCanvasBlockVisible(
                block.id,
                blocks,
                dockedOutIds,
                dockOutHidden
              )
            ) {
              return null
            }

            const sharedHandlers = {
              onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) =>
                startBlockDrag(event, block),
              onPointerUp: handlePointerUp,
              onSelect: () => {
                if (
                  blockClickRef.current?.blockId === block.id &&
                  blockClickRef.current.moved
                ) {
                  return
                }
                selectBlock(block.id)
              },
              onEdit: () => openBlockEditor(block.id),
              onMeasure: (height: number) => reportBlockHeight(block.id, height),
            }

            if (isCounterBlock(block)) {
              return (
                <CounterBlock
                  key={block.id}
                  block={block}
                  isExpanded={expandedIds.has(block.id)}
                  canEdit={canEditBlock(block, user)}
                  userStudentId={user?.studentId}
                  {...sharedHandlers}
                  onIncrement={() => adjustCounter(block.id, 1)}
                  onDecrement={() => adjustCounter(block.id, -1)}
                />
              )
            }

            if (isCommentBlock(block)) {
              return (
                <CommentBlock
                  key={block.id}
                  block={block}
                  isExpanded={expandedIds.has(block.id)}
                  canEdit={canEditBlock(block, user)}
                  canComment={authorReady && Boolean(user)}
                  canViewIdentity={authorReady && Boolean(user)}
                  {...sharedHandlers}
                  onAddComment={(text, imageDataUrl) =>
                    appendComment(block.id, text, imageDataUrl)
                  }
                />
              )
            }

            if (isLinkBlock(block)) {
              return (
                <LinkNodeBlock
                  key={block.id}
                  block={block}
                  isRevealed={!collapsedLinkIds.has(block.id)}
                  onPointerDown={(event) => startBlockDrag(event, block)}
                  onPointerUp={handlePointerUp}
                  onSelect={() => activateLinkBlock(block)}
                  onMeasure={(height) => reportBlockHeight(block.id, height)}
                />
              )
            }

            if (isDockBlock(block)) {
              const dockedBlocks = block.dockedBlockIds
                .map((id) => blocksById.get(id))
                .filter((item): item is BoardBlock => Boolean(item))

              return (
                <DockBlock
                  key={block.id}
                  block={block}
                  dockedBlocks={dockedBlocks}
                  dockedOutIds={dockedOutIds}
                  outNodesVisible={!dockOutHidden.has(block.id)}
                  isExpanded={expandedIds.has(block.id)}
                  isSnapTarget={dockHoverId === block.id}
                  canEdit={canEditBlock(block, user)}
                  onPointerDown={(event) => startBlockDrag(event, block)}
                  onPointerUp={handlePointerUp}
                  onSelect={sharedHandlers.onSelect}
                  onMeasure={(height) => reportBlockHeight(block.id, height)}
                  onToggleOutVisibility={() => toggleDockOutVisibility(block.id)}
                  onToggleOut={(blockId) => toggleDockedOut(block.id, blockId)}
                  onUndock={(blockId) => undockBlock(block.id, blockId)}
                  onOpenPanel={() => openPanel(block.id, false)}
                />
              )
            }

            return (
              <TextBlock
                key={block.id}
                block={block}
                isExpanded={expandedIds.has(block.id)}
                canEdit={canEditBlock(block, user)}
                {...sharedHandlers}
              />
            )
          })}

          <svg
            aria-hidden="true"
            viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
            className="pointer-events-none absolute inset-0 z-[15] h-full w-full overflow-visible"
          >
            {renderBoardConnections(
              connections,
              blocks,
              blockHeights,
              dockedOutIds,
              dockOutHidden
            )}
          </svg>
        </div>

        {selectedBlock && (
          <aside
            data-board-panel
            onPointerDown={(event) => event.stopPropagation()}
            className="absolute top-4 right-4 z-40 flex max-h-[calc(100%-2rem)] w-[min(24rem,calc(100%-2rem))] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl animate-in fade-in slide-in-from-right-4 duration-300 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <div className="border-b border-neutral-200 px-6 py-5 dark:border-neutral-800">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {selectedBlock.author.avatarUrl ? (
                    <img
                      src={selectedBlock.author.avatarUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-neutral-200"
                    />
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded-full bg-neutral-200" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                      {selectedBlock.author.displayName}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {selectedBlock.author.studentId}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="ปิดรายละเอียด"
                  onClick={() => closePanel()}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 space-y-7 overflow-y-auto px-6 pt-7 pb-6">
              {isCounterBlock(selectedBlock) ? (
                <>
                  <div className="space-y-3.5">
                    <Label htmlFor={`counter-name-${selectedBlock.id}`}>ชื่อตัวนับ</Label>
                    {isPanelEditing ? (
                      <Input
                        id={`counter-name-${selectedBlock.id}`}
                        value={selectedBlock.name}
                        onChange={(event) =>
                          updateBlock(selectedBlock.id, { name: event.target.value })
                        }
                        placeholder="ชื่อตัวนับ..."
                        className="mt-2"
                      />
                    ) : (
                      <div className="mt-2 rounded-xl border border-blue-200 bg-white px-4 py-4">
                        <p className="text-sm font-medium text-blue-800">
                          {selectedBlock.name.trim() || "ตัวนับ"}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3.5">
                    <Label>ค่าปัจจุบัน</Label>
                    {(() => {
                      const hasUserVoted = counterUserHasVoted(
                        selectedBlock,
                        user?.studentId
                      )
                      const canIncrement = canEditSelected && !hasUserVoted
                      const canDecrement = canEditSelected && hasUserVoted

                      return (
                        <div className="mt-2 flex flex-col items-center gap-1">
                          <p className="max-w-full truncate px-1 text-center text-[11px] font-semibold text-blue-700">
                            {selectedBlock.name.trim() || "ตัวนับ"}
                          </p>
                          <CounterPillRow
                            value={selectedBlock.value}
                            canIncrement={canIncrement}
                            canDecrement={canDecrement}
                            onIncrement={() => adjustCounter(selectedBlock.id, 1)}
                            onDecrement={() => adjustCounter(selectedBlock.id, -1)}
                            className="w-full max-w-[16rem]"
                          />
                        </div>
                      )
                    })()}
                  </div>

                  <div className="space-y-3.5">
                    <Label>กด + โดย</Label>
                    {selectedBlock.increments.length > 0 ? (
                      <ul className="mt-2 space-y-2">
                        {[...selectedBlock.increments].reverse().map((entry) => (
                          <li
                            key={entry.id}
                            className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2.5"
                          >
                            {entry.user.avatarUrl ? (
                              <img
                                src={entry.user.avatarUrl}
                                alt=""
                                className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-blue-100"
                              />
                            ) : (
                              <div className="h-7 w-7 shrink-0 rounded-full bg-blue-100" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-neutral-800">
                                {entry.user.displayName}
                              </p>
                              <p className="text-xs text-neutral-500">
                                {formatCreatedAt(entry.at)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-2 rounded-xl border border-blue-100 bg-white px-4 py-4">
                        <p className="text-sm text-neutral-400">ยังไม่มีใครกด +</p>
                      </div>
                    )}
                  </div>
                </>
              ) : isCommentBlock(selectedBlock) ? (
                <>
                  <div className="space-y-3.5">
                    <Label htmlFor={`comment-title-${selectedBlock.id}`}>หัวข้อ</Label>
                    {isPanelEditing ? (
                      <textarea
                        ref={messageRef}
                        id={`comment-title-${selectedBlock.id}`}
                        value={selectedBlock.title}
                        onChange={(event) =>
                          updateBlock(selectedBlock.id, { title: event.target.value })
                        }
                        placeholder="หัวข้อความคิดเห็น..."
                        rows={3}
                        className="mt-2 w-full resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3.5 text-sm leading-relaxed text-neutral-800 outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                      />
                    ) : (
                      <div className="mt-2 rounded-xl bg-neutral-50 px-4 py-4 dark:bg-neutral-800">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-neutral-700 dark:text-neutral-200">
                          {selectedBlock.title.trim() || (
                            <span className="text-neutral-400">ความคิดเห็น</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3.5">
                    <Label>ความคิดเห็น</Label>
                    <div className="mt-2 rounded-xl bg-neutral-50 px-4 py-4 dark:bg-neutral-800">
                      <p className="text-sm text-neutral-600 dark:text-neutral-300">
                        {selectedBlock.comments.length} ความคิดเห็น
                      </p>
                      <p className="mt-1 text-xs text-neutral-400">
                        {authorReady && user
                          ? "ขยาย Node บนบอร์ดเพื่อดูและแสดงความคิดเห็น"
                          : "ขยาย Node บนบอร์ดเพื่อดูและแสดงความคิดเห็น (นิรนาม)"}
                      </p>
                    </div>
                  </div>
                </>
              ) : isLinkBlock(selectedBlock) ? (
                <>
                  <div className="space-y-3.5">
                    <Label htmlFor={`link-name-${selectedBlock.id}`}>ชื่อลิงก์</Label>
                    {isPanelEditing ? (
                      <Input
                        id={`link-name-${selectedBlock.id}`}
                        value={selectedBlock.name}
                        onChange={(event) =>
                          updateBlock(selectedBlock.id, { name: event.target.value })
                        }
                        placeholder="ชื่อลิงก์..."
                        className="mt-2 text-base"
                        autoFocus
                      />
                    ) : (
                      <div className="mt-2 rounded-xl bg-neutral-50 px-4 py-4 dark:bg-neutral-800">
                        <p className="text-base text-neutral-700 dark:text-neutral-200">
                          {selectedBlock.name.trim() || (
                            <span className="text-neutral-400">ยังไม่มีชื่อ</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3.5">
                    <Label htmlFor={`link-url-${selectedBlock.id}`}>ที่อยู่ลิงก์</Label>
                    {isPanelEditing ? (
                      <Input
                        id={`link-url-${selectedBlock.id}`}
                        type="url"
                        value={selectedBlock.url}
                        onChange={(event) =>
                          updateBlock(selectedBlock.id, { url: event.target.value })
                        }
                        placeholder="วางลิงก์ที่นี่..."
                        className="mt-2 text-base"
                      />
                    ) : (
                      <div className="mt-2 rounded-xl bg-neutral-50 px-4 py-4 dark:bg-neutral-800">
                        {normalizeLinkUrl(selectedBlock.url) ? (
                          <a
                            href={normalizeLinkUrl(selectedBlock.url)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-base text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                          >
                            {selectedBlock.name.trim() || selectedBlock.url.trim()}
                          </a>
                        ) : (
                          <p className="text-sm text-neutral-400">ยังไม่มีที่อยู่ลิงก์</p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : isDockBlock(selectedBlock) ? (
                <>
                  <div className="space-y-3.5">
                    <Label> Node ในด็อก</Label>
                    {selectedBlock.dockedBlockIds.length > 0 ? (
                      <ul className="mt-2 space-y-2">
                        {selectedBlock.dockedBlockIds.map((dockedId) => {
                          const docked = blocksById.get(dockedId)
                          if (!docked) return null
                          const isOut = dockedOutIds.has(dockedId)
                          return (
                            <li
                              key={dockedId}
                              className="group flex items-stretch gap-2"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  toggleDockedOut(selectedBlock.id, dockedId)
                                }
                                className={cn(
                                  "flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm leading-snug transition-colors",
                                  isOut
                                    ? "border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-100 dark:hover:bg-blue-950/60"
                                    : "border-neutral-200 bg-neutral-50 text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
                                )}
                              >
                                <BlockKindIcon block={docked} />
                                <span className="truncate">{blockLabel(docked)}</span>
                              </button>
                              {canEditSelected && (
                                <button
                                  type="button"
                                  aria-label={`นำ ${blockLabel(docked)} ออกจากด็อก`}
                                  onClick={() =>
                                    undockBlock(selectedBlock.id, dockedId)
                                  }
                                  className="shrink-0 self-center px-1 text-neutral-600 opacity-70 transition-all duration-200 hover:scale-110 hover:opacity-100 active:scale-95 dark:text-neutral-300"
                                >
                                  <SquareArrowOutUpRight className="h-4 w-4" />
                                </button>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <div className="mt-2 rounded-xl bg-neutral-50 px-4 py-4 dark:bg-neutral-800">
                        <p className="text-sm text-neutral-500">
                          ลาก Node มาวางในด็อกเพื่อเก็บไว้ที่นี่
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : isTextBlock(selectedBlock) ? (
                <>
                  <div className="space-y-3.5">
                    <Label htmlFor={`message-${selectedBlock.id}`}>ข้อความ</Label>
                    {isPanelEditing ? (
                      <textarea
                        ref={messageRef}
                        id={`message-${selectedBlock.id}`}
                        value={selectedBlock.text}
                        onChange={(event) =>
                          updateBlock(selectedBlock.id, { text: event.target.value })
                        }
                        placeholder="พิมพ์ข้อความ..."
                        rows={4}
                        className="mt-2 w-full resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3.5 text-sm leading-relaxed text-neutral-800 outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus-visible:ring-neutral-600"
                      />
                    ) : (
                      <div className="mt-2 rounded-xl bg-neutral-50 px-4 py-4 dark:bg-neutral-800">
                        <p className="max-h-32 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-neutral-700 dark:text-neutral-200">
                          {selectedBlock.text || (
                            <span className="text-neutral-400">ยังไม่มีข้อความ</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3.5">
                    <Label htmlFor={`description-${selectedBlock.id}`}>คำอธิบาย</Label>
                    {isPanelEditing ? (
                      <textarea
                        id={`description-${selectedBlock.id}`}
                        value={selectedBlock.description}
                        onChange={(event) =>
                          updateBlock(selectedBlock.id, { description: event.target.value })
                        }
                        placeholder="เพิ่มคำอธิบายสั้น ๆ สำหรับข้อความนี้..."
                        rows={4}
                        className="mt-2 w-full resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3.5 text-sm leading-relaxed text-neutral-800 outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus-visible:ring-neutral-600"
                      />
                    ) : (
                      <div className="mt-2 rounded-xl bg-neutral-50 px-4 py-4 dark:bg-neutral-800">
                        <p className="max-h-32 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-neutral-600 dark:text-neutral-300">
                          {selectedBlock.description.trim() || (
                            <span className="text-neutral-400">ยังไม่มีคำอธิบาย</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : null}

              <div className="space-y-5 border-t border-neutral-200 pt-7 dark:border-neutral-800">
                <div className="space-y-3.5">
                  <Label>เชื่อมไปยัง</Label>
                  {selectedChildBlocks.length > 0 ? (
                    <ul className="mt-2 space-y-2">
                      {selectedChildBlocks.map(({ connectionId, block }) => (
                        <li key={connectionId} className="group flex items-stretch gap-2">
                          <button
                            type="button"
                            onClick={() => openPanel(block.id, false)}
                            className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm leading-snug text-neutral-800 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
                          >
                            {blockLabel(block)}
                          </button>
                          {canEditSelected && (
                          <button
                            type="button"
                            aria-label={`ยกเลิกการเชื่อมจาก ${blockLabel(block)}`}
                            onClick={() => disconnectConnection(connectionId)}
                            className="shrink-0 self-center px-1 text-red-600 opacity-70 transition-all duration-200 hover:scale-110 hover:opacity-100 active:scale-95 dark:text-red-400"
                          >
                            <Unlink className="h-4 w-4" />
                          </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:bg-neutral-800">
                      ยังไม่มีการเชื่อมออก
                    </p>
                  )}
                </div>

                <div className="space-y-3.5">
                  <Label>เชื่อมมาจาก</Label>
                  {selectedParentBlocks.length > 0 ? (
                    <ul className="mt-2 space-y-2">
                      {selectedParentBlocks.map(({ connectionId, block }) => (
                        <li key={connectionId} className="group flex items-stretch gap-2">
                          <button
                            type="button"
                            onClick={() => openPanel(block.id, false)}
                            className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm leading-snug text-neutral-800 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
                          >
                            {blockLabel(block)}
                          </button>
                          {canEditSelected && (
                          <button
                            type="button"
                            aria-label={`ยกเลิกการเชื่อมจาก ${blockLabel(block)}`}
                            onClick={() => disconnectConnection(connectionId)}
                            className="shrink-0 self-center px-1 text-red-600 opacity-70 transition-all duration-200 hover:scale-110 hover:opacity-100 active:scale-95 dark:text-red-400"
                          >
                            <Unlink className="h-4 w-4" />
                          </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:bg-neutral-800">
                      ยังไม่ถูกเชื่อมจากข้อความอื่น
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 px-1 text-xs text-neutral-500">
                <CalendarClock className="h-4 w-4 shrink-0" />
                สร้างเมื่อ {formatCreatedAt(selectedBlock.createdAt)}
              </div>
            </div>

            <div className="space-y-3 border-t border-neutral-200 px-5 py-4 dark:border-neutral-800">
              {canEditSelected && !isDockBlock(selectedBlock) && (
                isPanelEditing ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsPanelEditing(false)}
                  >
                    เสร็จสิ้น
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => openBlockEditor(selectedBlock.id)}
                  >
                    <Pencil className="me-2 h-4 w-4" />
                    แก้ไข
                  </Button>
                )
              )}

              {canEditSelected && (
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  setConnectingFromId(selectedBlock.id)
                  closePanel()
                }}
              >
                <Link2 className="me-2 h-4 w-4" />
                เชื่อมต่อ
              </Button>
              )}

              {canEditSelected && (
              !deleteConfirmOpen ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 className="me-2 h-4 w-4" />
                  {isCounterBlock(selectedBlock)
                    ? "ลบตัวนับ"
                    : isCommentBlock(selectedBlock)
                      ? "ลบความคิดเห็น"
                      : isLinkBlock(selectedBlock)
                        ? "ลบลิงก์"
                        : isDockBlock(selectedBlock)
                          ? "ลบด็อก"
                          : "ลบข้อความ"}
                </Button>
              ) : (
                <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    {isCounterBlock(selectedBlock)
                      ? "ลบตัวนับนี้หรือไม่?"
                      : isCommentBlock(selectedBlock)
                        ? "ลบ Node ความคิดเห็นนี้หรือไม่?"
                        : isLinkBlock(selectedBlock)
                          ? "ลบลิงก์นี้หรือไม่?"
                          : isDockBlock(selectedBlock)
                            ? "ลบด็อกนี้หรือไม่?"
                            : "ลบข้อความนี้หรือไม่?"}
                  </p>
                  <p className="text-xs leading-relaxed text-red-700/80 dark:text-red-300/80">
                    {isCounterBlock(selectedBlock)
                      ? "ตัวนับและการเชื่อมต่อทั้งหมดจะถูกลบออก"
                      : isCommentBlock(selectedBlock)
                        ? "ความคิดเห็นทั้งหมดและการเชื่อมต่อจะถูกลบออก"
                        : isLinkBlock(selectedBlock)
                          ? "ลิงก์และการเชื่อมต่อจะถูกลบออก"
                          : isDockBlock(selectedBlock)
                            ? "ด็อกจะถูกลบออก  Node ที่อยู่ภายในจะกลับไปแสดงบนบอร์ด"
                            : "ข้อความ คำอธิบาย และการเชื่อมต่อทั้งหมดจะถูกลบออก"}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setDeleteConfirmOpen(false)}
                    >
                      ยกเลิก
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        deleteBlock(selectedBlock.id)
                        setDeleteConfirmOpen(false)
                      }}
                    >
                      ลบถาวร
                    </Button>
                  </div>
                </div>
              )
              )}
            </div>
          </aside>
        )}

        {!isLoading && blocks.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 rounded-xl bg-white/85 px-6 py-5 text-center shadow-sm backdrop-blur-sm dark:bg-neutral-900/85">
              <Type className="h-6 w-6 text-neutral-400" />
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                พื้นที่นี้ว่างเปล่า
              </p>
              <p className="text-xs text-neutral-500">
                กดปุ่มเพิ่มข้อความหรือเพิ่ม Node เพื่อวางบนบอร์ด
              </p>
            </div>
          </div>
        )}

        {isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-neutral-950/60"
            aria-label="กำลังโหลดบอร์ด"
          >
            <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
          </div>
        )}
      </div>

      {dockDropPending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dock-drop-confirm-title"
        >
          <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-5 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
            <p
              id="dock-drop-confirm-title"
              className="text-sm font-medium text-neutral-800 dark:text-neutral-100"
            >
               Node นี้มีการเชื่อมต่อ {dockDropPending.connectionIds.length} รายการ
            </p>
            <p className="mt-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              ต้องการตัดการเชื่อมทั้งหมดก่อนนำเข้าด็อก หรือเก็บการเชื่อมไว้?
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                type="button"
                className="w-full"
                onClick={() =>
                  dockBlockInto(
                    dockDropPending.dockId,
                    dockDropPending.blockId,
                    true
                  )
                }
              >
                ตัดการเชื่อมทั้งหมด
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() =>
                  dockBlockInto(
                    dockDropPending.dockId,
                    dockDropPending.blockId,
                    false
                  )
                }
              >
                เก็บการเชื่อมไว้
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setDockDropPending(null)}
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        </div>
      )}

      {leaveConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-confirm-title"
        >
          <div className="w-full max-w-sm rounded-xl border border-red-200 bg-red-50 p-5 shadow-lg dark:border-red-900/50 dark:bg-red-950/30">
            <p
              id="leave-confirm-title"
              className="text-sm font-medium text-red-800 dark:text-red-300"
            >
              ยังไม่ได้บันทึกการเปลี่ยนแปลง
            </p>
            <p className="mt-2 text-xs leading-relaxed text-red-700/80 dark:text-red-300/80">
              มีการแก้ไขที่ยังไม่ได้บันทึก หากออกจากหน้านี้ การเปลี่ยนแปลงจะหายไป
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setLeaveConfirmOpen(false)}
              >
                แก้ไขต่อ
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                onClick={() => router.push("/announces")}
              >
                ออกโดยไม่บันทึก
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
