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
  Plus,
  Trash2,
  Type,
  Unlink,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { fetchAnnouncement } from "@/lib/announcements"
import { useCurrentUser } from "@/lib/userProfile"
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  createTextBlock,
  loadBoard,
  saveBoard,
  type BoardConnection,
  type BoardTextBlock,
} from "@/lib/announcementBoard"

type Point = { x: number; y: number }
type Size = { width: number; height: number }

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** Keeps the board edges from drifting away from the viewport. */
function clampPan(pan: Point, viewport: Size): Point {
  const minX = Math.min(0, viewport.width - BOARD_WIDTH)
  const minY = Math.min(0, viewport.height - BOARD_HEIGHT)
  return {
    x: clamp(pan.x, minX, 0),
    y: clamp(pan.y, minY, 0),
  }
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
}

function TextBlock({
  block,
  isSelected,
  onPointerDown,
  onPointerUp,
  onSelect,
  onMeasure,
}: {
  block: BoardTextBlock
  isSelected: boolean
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void
  onSelect: () => void
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
  }, [onMeasure, block.text, isSelected])

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
        "absolute min-h-32 cursor-move rounded-lg border bg-white p-3 shadow-[0_2px_6px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-shadow dark:bg-neutral-900 dark:shadow-[0_4px_20px_rgba(0,0,0,0.45)]",
        isSelected
          ? "border-neutral-900 shadow-[0_4px_10px_rgba(0,0,0,0.1),0_16px_40px_rgba(0,0,0,0.18)] dark:border-neutral-100 dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
          : "border-transparent hover:border-neutral-300 hover:shadow-[0_4px_10px_rgba(0,0,0,0.1),0_12px_32px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_6px_28px_rgba(0,0,0,0.55)]"
      )}
    >
      <div className="mb-2 flex items-center gap-2 border-b border-neutral-200/80 pb-2">
        {block.author.avatarUrl ? (
          <img
            src={block.author.avatarUrl}
            alt=""
            className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-neutral-200"
          />
        ) : (
          <div className="h-7 w-7 shrink-0 rounded-full bg-neutral-200" />
        )}
        <span className="truncate text-xs font-medium text-neutral-600">
          {block.author.displayName}
        </span>
      </div>

      <p className="min-h-12 leading-snug whitespace-pre-wrap break-words select-none">
        {block.text || (
          <span className="text-neutral-400">ยังไม่มีข้อความ</span>
        )}
      </p>
    </div>
  )
}

export default function AnnouncementBoardPage() {
  const params = useParams<{ id: string }>()
  const announcementId = params.id
  const { user } = useCurrentUser()

  const viewportRef = useRef<HTMLDivElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const panDragRef = useRef<PanDrag | null>(null)
  const blockDragRef = useRef<BlockDrag | null>(null)
  const panRef = useRef<Point>({ x: 0, y: 0 })
  const viewportSizeRef = useRef<Size>({ width: 0, height: 0 })
  const blocksRef = useRef<BoardTextBlock[]>([])

  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 })
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const [blocks, setBlocks] = useState<BoardTextBlock[]>([])
  const [connections, setConnections] = useState<BoardConnection[]>([])
  const [blockHeights, setBlockHeights] = useState<Record<string, number>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null)
  const [title, setTitle] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  panRef.current = pan
  blocksRef.current = blocks
  viewportSizeRef.current = viewport

  useEffect(() => {
    const element = viewportRef.current
    if (!element) return

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setViewport({ width, height })
      setPan((current) => clampPan(current, { width, height }))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      const content = await loadBoard(announcementId)
      if (!cancelled) {
        setBlocks(content.blocks)
        setConnections(content.connections)
        setSavedAt(content.updatedAt)
        setIsDirty(false)
        setIsLoading(false)
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

  const changeSelection = useCallback(
    (id: string | null) => {
      setSelectedId((current) => {
        if (current && current !== id) pruneEmptyBlock(current)
        return id
      })
      setDeleteConfirmOpen(false)
    },
    [pruneEmptyBlock]
  )

  const deleteBlock = useCallback((id: string) => {
    setBlocks((current) => current.filter((block) => block.id !== id))
    setConnections((current) =>
      current.filter(
        (connection) => connection.fromId !== id && connection.toId !== id
      )
    )
    setSelectedId((current) => (current === id ? null : current))
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
    const centerX = (-pan.x + viewport.width / 2) / BOARD_WIDTH
    const centerY = (-pan.y + viewport.height / 2) / BOARD_HEIGHT
    const block = createTextBlock(clamp(centerX - 0.05, 0, 0.9), clamp(centerY - 0.03, 0, 0.94), {
      studentId: user?.studentId ?? "ไม่ระบุ",
      displayName: user?.displayName ?? "ผู้เยี่ยมชม",
      avatarUrl: user?.avatarUrl,
    })

    setBlocks((current) => [...current, block])
    changeSelection(block.id)
    setIsDirty(true)
  }, [pan, viewport, user, changeSelection])

  const selectBlock = useCallback(
    (id: string) => {
      if (!connectingFromId) {
        changeSelection(id)
        return
      }

      if (connectingFromId === id) {
        setConnectingFromId(null)
        changeSelection(id)
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
      changeSelection(id)
      setIsDirty(true)
    },
    [connectingFromId, changeSelection]
  )

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const content = await saveBoard(announcementId, blocks, connections)
      setSavedAt(content.updatedAt)
      setIsDirty(false)
    } finally {
      setIsSaving(false)
    }
  }, [announcementId, blocks, connections])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return
      if (event.key === "Escape") {
        changeSelection(null)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [changeSelection])

  useEffect(() => {
    if (!selectedId) return
    const block = blocks.find((item) => item.id === selectedId)
    if (!block || block.text.trim()) return
    messageRef.current?.focus()
  }, [selectedId, blocks])

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
    }
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
        const nextX =
          blockDrag.originX + (event.clientX - blockDrag.startX) / BOARD_WIDTH
        const nextY =
          blockDrag.originY + (event.clientY - blockDrag.startY) / BOARD_HEIGHT
        const block = blocksRef.current.find((item) => item.id === blockDrag.blockId)
        const maxX = 1 - (block?.width ?? 0)
        const maxY = 1 - blockDrag.heightFraction

        updateBlock(blockDrag.blockId, {
          x: clamp(nextX, 0, Math.max(0, maxX)),
          y: clamp(nextY, 0, Math.max(0, maxY)),
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
          viewportSizeRef.current
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
    if ((event.target as HTMLElement).closest("[data-board-panel]")) return

    event.preventDefault()
    changeSelection(null)
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
            <p className="text-xs text-neutral-500">
              ลากพื้นที่เพื่อเลื่อนดู · คลิกข้อความเพื่อแก้ไขในแผงด้านข้าง
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">
            {isDirty
              ? "ยังไม่ได้บันทึก"
              : savedAt
                ? `บันทึกแล้ว ${new Date(savedAt).toLocaleTimeString("th-TH")}`
                : "ยังไม่มีการเปลี่ยนแปลง"}
          </span>
          <Button type="button" variant="outline" onClick={addTextBlock}>
            <Plus className="me-2 h-4 w-4" />
            เพิ่มข้อความ
          </Button>
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
        </div>
      </header>

      <div
        ref={viewportRef}
        onPointerDown={handleViewportPointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          "relative flex-1 touch-none overflow-hidden bg-neutral-100 dark:bg-neutral-900",
          isPanning ? "cursor-grabbing" : "cursor-default"
        )}
      >
        {connectingFromId && (
          <div className="pointer-events-none absolute top-4 left-1/2 z-40 -translate-x-1/2 rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium text-white shadow-lg">
            เลือกข้อความอื่นเพื่อเชื่อมต่อ
          </div>
        )}

        <div
          data-board-surface
          style={{
            width: BOARD_WIDTH,
            height: BOARD_HEIGHT,
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`,
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
              isSelected={selectedId === block.id}
              onPointerDown={(event) => startBlockDrag(event, block)}
              onPointerUp={handlePointerUp}
              onSelect={() => selectBlock(block.id)}
              onMeasure={(height) => reportBlockHeight(block.id, height)}
            />
          ))}
        </div>

        {selectedBlock && (
          <aside
            data-board-panel
            onPointerDown={(event) => event.stopPropagation()}
            className="absolute top-4 right-4 z-40 flex max-h-[calc(100%-2rem)] w-[min(24rem,calc(100%-2rem))] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
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
                  onClick={() => changeSelection(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 space-y-7 overflow-y-auto px-6 pt-7 pb-6">
              <div className="space-y-3.5">
                <Label htmlFor={`message-${selectedBlock.id}`}>ข้อความ</Label>
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
              </div>

              <div className="space-y-3.5">
                <Label htmlFor={`description-${selectedBlock.id}`}>คำอธิบาย</Label>
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
                            onClick={() => changeSelection(block.id)}
                            className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm leading-snug text-neutral-800 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
                          >
                            {blockLabel(block)}
                          </button>
                          <button
                            type="button"
                            aria-label={`ยกเลิกการเชื่อมจาก ${blockLabel(block)}`}
                            onClick={() => disconnectConnection(connectionId)}
                            className="shrink-0 self-center px-1 text-red-600 opacity-70 transition-all duration-200 hover:scale-110 hover:opacity-100 active:scale-95 dark:text-red-400"
                          >
                            <Unlink className="h-4 w-4" />
                          </button>
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
                            onClick={() => changeSelection(block.id)}
                            className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm leading-snug text-neutral-800 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
                          >
                            {blockLabel(block)}
                          </button>
                          <button
                            type="button"
                            aria-label={`ยกเลิกการเชื่อมจาก ${blockLabel(block)}`}
                            onClick={() => disconnectConnection(connectionId)}
                            className="shrink-0 self-center px-1 text-red-600 opacity-70 transition-all duration-200 hover:scale-110 hover:opacity-100 active:scale-95 dark:text-red-400"
                          >
                            <Unlink className="h-4 w-4" />
                          </button>
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
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  setConnectingFromId(selectedBlock.id)
                  changeSelection(null)
                }}
              >
                <Link2 className="me-2 h-4 w-4" />
                เชื่อมต่อ
              </Button>

              {!deleteConfirmOpen ? (
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
