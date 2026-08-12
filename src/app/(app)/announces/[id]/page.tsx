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
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  CalendarClock,
  Link2,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  Type,
  Unlink,
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
  createTextBlock,
  fetchBoard,
  recordToBoardContent,
  updateBoard,
  type BoardConnection,
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

function blockLabel(block: BoardTextBlock) {
  const text = block.text.trim()
  return text.length > 72 ? `${text.slice(0, 72)}…` : text || "ข้อความไม่มีชื่อ"
}

type BlockRect = { x: number; y: number; w: number; h: number }

const DEFAULT_BLOCK_HEIGHT = 128
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

function blockRect(block: BoardTextBlock, heightPx: number): BlockRect {
  return {
    x: block.x * BOARD_WIDTH,
    y: block.y * BOARD_HEIGHT,
    w: block.width * BOARD_WIDTH,
    h: heightPx,
  }
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

const LINK_NODE_SIZE = 44
const LINK_NODE_OFFSET = 56

function normalizeLinkUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function defaultLinkNodeCenter(block: BoardTextBlock, heightPx: number): Point {
  const rect = blockRect(block, heightPx)
  return {
    x: rect.x + rect.w + LINK_NODE_OFFSET + LINK_NODE_SIZE / 2,
    y: rect.y + rect.h / 2,
  }
}

function resolveLinkNodeCenter(block: BoardTextBlock, heightPx: number): Point {
  const base = defaultLinkNodeCenter(block, heightPx)
  return {
    x: base.x + (block.linkNodeOffsetX ?? 0) * BOARD_WIDTH,
    y: base.y + (block.linkNodeOffsetY ?? 0) * BOARD_HEIGHT,
  }
}

function linkConnectionGeometry(block: BoardTextBlock, heightPx: number) {
  const rect = blockRect(block, heightPx)
  const node = resolveLinkNodeCenter(block, heightPx)
  const nodeRect: BlockRect = {
    x: node.x - LINK_NODE_SIZE / 2,
    y: node.y - LINK_NODE_SIZE / 2,
    w: LINK_NODE_SIZE,
    h: LINK_NODE_SIZE,
  }
  const start = edgeAnchor(rect, node)
  const end = edgeAnchor(nodeRect, rectCenter(rect))

  return {
    path: bezierPath(
      start,
      edgeOutward(start, rect),
      end,
      edgeOutward(end, nodeRect)
    ),
    start,
    end,
    node,
  }
}

function connectionGeometry(
  from: BoardTextBlock,
  to: BoardTextBlock,
  fromHeight: number,
  toHeight: number
) {
  const fromRect = blockRect(from, fromHeight)
  const toRect = blockRect(to, toHeight)
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

type LinkNodeDrag = {
  pointerId: number
  blockId: string
  startX: number
  startY: number
  originOffsetX: number
  originOffsetY: number
  moved: boolean
}

function LinkNode({
  blockId,
  center,
  url,
  isPulsing,
  canDrag,
  onDragStart,
  onOpen,
}: {
  blockId: string
  center: Point
  url: string
  isPulsing: boolean
  canDrag: boolean
  onDragStart: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onOpen: () => void
}) {
  const x = center.x - LINK_NODE_SIZE / 2
  const y = center.y - LINK_NODE_SIZE / 2

  return (
    <button
      type="button"
      data-link-node
      data-link-node-id={blockId}
      aria-label="เปิดลิงก์"
      title={url}
      style={{
        left: x,
        top: y,
        width: LINK_NODE_SIZE,
        height: LINK_NODE_SIZE,
      }}
      onPointerDown={(event) => {
        event.stopPropagation()
        if (canDrag) onDragStart(event)
      }}
      onClick={(event) => {
        event.stopPropagation()
        onOpen()
      }}
      className={cn(
        "link-node absolute z-20 overflow-hidden rounded-full border border-neutral-200/80 bg-white shadow-md transition-transform duration-150 ease-out",
        canDrag ? "cursor-move hover:scale-105 active:scale-95" : "cursor-pointer hover:scale-105 active:scale-95",
        isPulsing && "scale-90"
      )}
    >
      <span className="link-node-shimmer pointer-events-none absolute inset-0" aria-hidden="true" />
      <span className="relative z-10 flex h-full w-full items-center justify-center bg-white/80">
        <Paperclip className="h-4 w-4 text-neutral-700" strokeWidth={2.25} />
      </span>
    </button>
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

export default function AnnouncementBoardPage() {
  const params = useParams<{ id: string }>()
  const announcementId = params.id
  const { user, ready: authorReady } = useCurrentUser()

  const viewportRef = useRef<HTMLDivElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const panDragRef = useRef<PanDrag | null>(null)
  const blockDragRef = useRef<BlockDrag | null>(null)
  const linkNodeDragRef = useRef<LinkNodeDrag | null>(null)
  const linkClickRef = useRef<{ blockId: string; moved: boolean } | null>(null)
  const panRef = useRef<Point>({ x: 0, y: 0 })
  const zoomRef = useRef(DEFAULT_ZOOM)
  const viewportSizeRef = useRef<Size>({ width: 0, height: 0 })
  const blocksRef = useRef<BoardTextBlock[]>([])

  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 })
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [blocks, setBlocks] = useState<BoardTextBlock[]>([])
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
  const [linkPulseId, setLinkPulseId] = useState<string | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const selectedIdRef = useRef<string | null>(null)
  const hasCenteredRef = useRef(false)

  panRef.current = pan
  zoomRef.current = zoom
  blocksRef.current = blocks
  viewportSizeRef.current = viewport
  selectedIdRef.current = selectedId

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

  const updateBlock = useCallback((id: string, patch: Partial<BoardTextBlock>) => {
    setBlocks((current) =>
      current.map((block) => (block.id === id ? { ...block, ...patch } : block))
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
    if (!block || block.text.trim().length > 0) return

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
    setBlocks((current) => current.filter((block) => block.id !== id))
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
    setIsDirty(true)
  }, [])

  const disconnectConnection = useCallback((connectionId: string) => {
    setConnections((current) =>
      current.filter((connection) => connection.id !== connectionId)
    )
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
    openPanel(block.id, true)
    setIsDirty(true)
  }, [pan, viewport, user, openPanel, zoom])

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
      const input = { announcementId, blocks, connections }
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
    if (!block || block.text.trim()) return
    messageRef.current?.focus()
  }, [selectedId, isPanelEditing, blocks])

  const startLinkNodeDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    block: BoardTextBlock
  ) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    linkNodeDragRef.current = {
      pointerId: event.pointerId,
      blockId: block.id,
      startX: event.clientX,
      startY: event.clientY,
      originOffsetX: block.linkNodeOffsetX ?? 0,
      originOffsetY: block.linkNodeOffsetY ?? 0,
      moved: false,
    }
    linkClickRef.current = { blockId: block.id, moved: false }
  }

  const startBlockDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    block: BoardTextBlock
  ) => {
    event.stopPropagation()

    const element = event.currentTarget
    element.setPointerCapture(event.pointerId)
    blockDragRef.current = {
      pointerId: event.pointerId,
      blockId: block.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: block.x,
      originY: block.y,
      heightFraction: element.offsetHeight / BOARD_HEIGHT,
      moved: false,
    }
    blockClickRef.current = { blockId: block.id, moved: false }
  }

  const endPointer = useCallback((event: ReactPointerEvent | PointerEvent) => {
    const pointerId = event.pointerId

    if (blockDragRef.current?.pointerId === pointerId) {
      const blockEl = document.querySelector(
        `[data-block="${blockDragRef.current.blockId}"]`
      )
      if (blockEl instanceof HTMLElement) {
        try {
          blockEl.releasePointerCapture(pointerId)
        } catch {
          /* not captured */
        }
      }
      blockDragRef.current = null
    }

    if (linkNodeDragRef.current?.pointerId === pointerId) {
      const linkEl = document.querySelector(
        `[data-link-node-id="${linkNodeDragRef.current.blockId}"]`
      )
      if (linkEl instanceof HTMLElement) {
        try {
          linkEl.releasePointerCapture(pointerId)
        } catch {
          /* not captured */
        }
      }
      linkNodeDragRef.current = null
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
  }, [])

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
        const maxX = 1 - (block?.width ?? 0)
        const maxY = 1 - blockDrag.heightFraction

        updateBlock(blockDrag.blockId, {
          x: clamp(nextX, 0, Math.max(0, maxX)),
          y: clamp(nextY, 0, Math.max(0, maxY)),
        })
        return
      }

      const linkDrag = linkNodeDragRef.current
      if (linkDrag?.pointerId === event.pointerId) {
        if (
          Math.hypot(
            event.clientX - linkDrag.startX,
            event.clientY - linkDrag.startY
          ) > 4
        ) {
          linkDrag.moved = true
          if (linkClickRef.current?.blockId === linkDrag.blockId) {
            linkClickRef.current.moved = true
          }
        }

        const scaleX = BOARD_WIDTH * zoomRef.current
        const scaleY = BOARD_HEIGHT * zoomRef.current
        updateBlock(linkDrag.blockId, {
          linkNodeOffsetX:
            linkDrag.originOffsetX + (event.clientX - linkDrag.startX) / scaleX,
          linkNodeOffsetY:
            linkDrag.originOffsetY + (event.clientY - linkDrag.startY) / scaleY,
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

  const handleLinkOpen = useCallback((blockId: string, url: string) => {
    setLinkPulseId(blockId)
    window.setTimeout(() => setLinkPulseId(null), 180)
    window.open(url, "_blank", "noopener,noreferrer")
  }, [])

  const cancelConnect = useCallback(() => {
    setConnectingFromId(null)
  }, [])

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
            aria-label="กลับไปหน้าโน้ตประกาศ"
            render={<Link href="/announces" />}
            nativeButton={false}
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
          <svg
            aria-hidden="true"
            viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          >
            {connections.map((connection) => {
              const from = blocks.find((block) => block.id === connection.fromId)
              const to = blocks.find((block) => block.id === connection.toId)
              if (!from || !to) return null

              const geometry = connectionGeometry(
                from,
                to,
                blockHeights[from.id] ?? DEFAULT_BLOCK_HEIGHT,
                blockHeights[to.id] ?? DEFAULT_BLOCK_HEIGHT
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
            })}
          </svg>

          {blocks.map((block) => (
            <TextBlock
              key={block.id}
              block={block}
              isExpanded={expandedIds.has(block.id)}
              canEdit={canEditBlock(block, user)}
              onPointerDown={(event) => startBlockDrag(event, block)}
              onPointerUp={handlePointerUp}
              onSelect={() => {
                if (
                  blockClickRef.current?.blockId === block.id &&
                  blockClickRef.current.moved
                ) {
                  return
                }
                selectBlock(block.id)
              }}
              onEdit={() => openBlockEditor(block.id)}
              onMeasure={(height) => reportBlockHeight(block.id, height)}
            />
          ))}

          <svg
            aria-hidden="true"
            viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
            className="pointer-events-none absolute inset-0 z-[15] h-full w-full overflow-visible"
          >
            {blocks.map((block) => {
              const url = normalizeLinkUrl(block.link)
              if (!url) return null
              const height = blockHeights[block.id] ?? DEFAULT_BLOCK_HEIGHT
              const geometry = linkConnectionGeometry(block, height)

              return (
                <g key={`link-line-${block.id}`}>
                  <path
                    d={geometry.path}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                  <circle cx={geometry.start.x} cy={geometry.start.y} r="4" fill="#a855f7" />
                  <circle cx={geometry.end.x} cy={geometry.end.y} r="3" fill="#c084fc" />
                </g>
              )
            })}
          </svg>

          {blocks.map((block) => {
            const url = normalizeLinkUrl(block.link)
            if (!url) return null
            const height = blockHeights[block.id] ?? DEFAULT_BLOCK_HEIGHT
            const center = resolveLinkNodeCenter(block, height)

            return (
              <LinkNode
                key={`link-node-${block.id}`}
                blockId={block.id}
                center={center}
                url={url}
                isPulsing={linkPulseId === block.id}
                canDrag={canEditBlock(block, user)}
                onDragStart={(event) => startLinkNodeDrag(event, block)}
                onOpen={() => {
                  if (
                    linkClickRef.current?.blockId === block.id &&
                    linkClickRef.current.moved
                  ) {
                    return
                  }
                  handleLinkOpen(block.id, url)
                }}
              />
            )
          })}
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

              <div className="space-y-3.5">
                <Label htmlFor={`link-${selectedBlock.id}`}>เพิ่มลิงก์</Label>
                {isPanelEditing ? (
                  <Input
                    id={`link-${selectedBlock.id}`}
                    type="url"
                    value={selectedBlock.link}
                    onChange={(event) =>
                      updateBlock(selectedBlock.id, { link: event.target.value })
                    }
                    placeholder="https://example.com"
                  />
                ) : normalizeLinkUrl(selectedBlock.link) ? (
                  <a
                    href={normalizeLinkUrl(selectedBlock.link)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block truncate rounded-xl bg-neutral-50 px-4 py-3 text-sm text-blue-600 underline-offset-2 hover:underline dark:bg-neutral-800 dark:text-blue-400"
                  >
                    {selectedBlock.link.trim()}
                  </a>
                ) : (
                  <div className="mt-2 rounded-xl bg-neutral-50 px-4 py-4 dark:bg-neutral-800">
                    <p className="text-sm text-neutral-400">ยังไม่มีลิงก์</p>
                  </div>
                )}
              </div>

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
              {canEditSelected && (
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
                  ลบข้อความ
                </Button>
              ) : (
                <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    ลบข้อความนี้หรือไม่?
                  </p>
                  <p className="text-xs leading-relaxed text-red-700/80 dark:text-red-300/80">
                    ข้อความ คำอธิบาย และการเชื่อมต่อทั้งหมดจะถูกลบออก
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
                กดปุ่มเพิ่มข้อความเพื่อวางบนบอร์ด
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
    </div>
  )
}
