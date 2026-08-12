"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Loader2, Plus, Trash2, Type } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { fetchAnnouncement } from "@/lib/announcements"
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  createTextBlock,
  loadBoard,
  saveBoard,
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

type PanDrag = { pointerId: number; startX: number; startY: number; origin: Point }
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
  isEditing,
  onPointerDown,
  onPointerUp,
  onSelect,
  onEdit,
  onChange,
  onCommit,
  onDelete,
}: {
  block: BoardTextBlock
  isSelected: boolean
  isEditing: boolean
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void
  onSelect: () => void
  onEdit: () => void
  onChange: (text: string) => void
  onCommit: () => void
  onDelete: () => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!isEditing || !textarea) return
    textarea.style.height = "auto"
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [isEditing, block.text])

  useEffect(() => {
    if (!isEditing) return
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.focus()
    textarea.setSelectionRange(textarea.value.length, textarea.value.length)
  }, [isEditing])

  return (
    <div
      data-block={block.id}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onSelect}
      onDoubleClick={onEdit}
      style={{
        left: `${block.x * 100}%`,
        top: `${block.y * 100}%`,
        width: `${block.width * 100}%`,
        color: block.color,
        fontSize: block.fontSize,
      }}
      className={cn(
        "absolute rounded-lg border bg-white/90 p-3 shadow-sm backdrop-blur-sm transition-shadow",
        isEditing ? "cursor-text" : "cursor-move",
        isSelected
          ? "border-neutral-900 shadow-md dark:border-neutral-100"
          : "border-transparent hover:border-neutral-300"
      )}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={block.text}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onCommit}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault()
              onCommit()
            }
          }}
          placeholder="Type a message…"
          className="w-full resize-none overflow-hidden bg-transparent leading-snug outline-none"
          style={{ color: block.color, fontSize: block.fontSize }}
        />
      ) : (
        <p className="leading-snug whitespace-pre-wrap break-words select-none">
          {block.text || (
            <span className="text-neutral-400">Double-click to edit</span>
          )}
        </p>
      )}

      {isSelected && !isEditing && (
        <button
          type="button"
          aria-label="Delete text"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
          className="absolute -top-3 -right-3 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm hover:text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

export default function AnnouncementBoardPage() {
  const params = useParams<{ id: string }>()
  const announcementId = params.id

  const viewportRef = useRef<HTMLDivElement>(null)
  const panDragRef = useRef<PanDrag | null>(null)
  const blockDragRef = useRef<BlockDrag | null>(null)

  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 })
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const [blocks, setBlocks] = useState<BoardTextBlock[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [isPanning, setIsPanning] = useState(false)

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

  const deleteBlock = useCallback((id: string) => {
    setBlocks((current) => current.filter((block) => block.id !== id))
    setSelectedId((current) => (current === id ? null : current))
    setEditingId((current) => (current === id ? null : current))
    setIsDirty(true)
  }, [])

  const addTextBlock = useCallback(() => {
    // Drop the new block near the middle of whatever part of the board is visible.
    const centerX = (-pan.x + viewport.width / 2) / BOARD_WIDTH
    const centerY = (-pan.y + viewport.height / 2) / BOARD_HEIGHT
    const block = createTextBlock(
      clamp(centerX - 0.05, 0, 0.9),
      clamp(centerY - 0.03, 0, 0.94)
    )

    setBlocks((current) => [...current, block])
    setSelectedId(block.id)
    setEditingId(block.id)
    setIsDirty(true)
  }, [pan, viewport])

  const commitEditing = useCallback(
    (id: string) => {
      setEditingId((current) => (current === id ? null : current))
      setBlocks((current) =>
        current.filter((block) => block.id !== id || block.text.trim().length > 0)
      )
    },
    []
  )

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const content = await saveBoard(announcementId, blocks)
      setSavedAt(content.updatedAt)
      setIsDirty(false)
    } finally {
      setIsSaving(false)
    }
  }, [announcementId, blocks])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (editingId) return
      if (event.key === "Escape") setSelectedId(null)
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        event.preventDefault()
        deleteBlock(selectedId)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [editingId, selectedId, deleteBlock])

  const startBlockDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    block: BoardTextBlock
  ) => {
    if (editingId === block.id) return
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

  useEffect(() => {
    const onWindowPointerUp = (event: PointerEvent) => endPointer(event)
    window.addEventListener("pointerup", onWindowPointerUp)
    window.addEventListener("pointercancel", onWindowPointerUp)
    return () => {
      window.removeEventListener("pointerup", onWindowPointerUp)
      window.removeEventListener("pointercancel", onWindowPointerUp)
    }
  }, [endPointer])

  const handleViewportPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("[data-block]")) return

    setSelectedId(null)
    setEditingId(null)
    viewportRef.current?.setPointerCapture(event.pointerId)
    panDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: pan,
    }
    setIsPanning(true)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const blockDrag = blockDragRef.current
    if (blockDrag?.pointerId === event.pointerId) {
      const nextX = blockDrag.originX + (event.clientX - blockDrag.startX) / BOARD_WIDTH
      const nextY = blockDrag.originY + (event.clientY - blockDrag.startY) / BOARD_HEIGHT
      const block = blocks.find((item) => item.id === blockDrag.blockId)
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
        viewport
      )
    )
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    endPointer(event)
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Back to announcements"
            render={<Link href="/announces" />}
            nativeButton={false}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-neutral-800 dark:text-neutral-200">
              {title ?? "Board"}
            </h1>
            <p className="text-xs text-neutral-500">
              Drag the space to move around · double-click a text to edit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">
            {isDirty
              ? "Unsaved changes"
              : savedAt
                ? `Saved ${new Date(savedAt).toLocaleTimeString()}`
                : "No changes yet"}
          </span>
          <Button type="button" variant="outline" onClick={addTextBlock}>
            <Plus className="me-2 h-4 w-4" />
            Add text
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </header>

      <div
        ref={viewportRef}
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          "relative flex-1 touch-none overflow-hidden bg-neutral-100 dark:bg-neutral-900",
          isPanning ? "cursor-grabbing" : "cursor-default"
        )}
      >
        <div
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
          {blocks.map((block) => (
            <TextBlock
              key={block.id}
              block={block}
              isSelected={selectedId === block.id}
              isEditing={editingId === block.id}
              onPointerDown={(event) => startBlockDrag(event, block)}
              onPointerUp={handlePointerUp}
              onSelect={() => setSelectedId(block.id)}
              onEdit={() => {
                setSelectedId(block.id)
                setEditingId(block.id)
              }}
              onChange={(text) => updateBlock(block.id, { text })}
              onCommit={() => commitEditing(block.id)}
              onDelete={() => deleteBlock(block.id)}
            />
          ))}
        </div>

        {!isLoading && blocks.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 rounded-xl bg-white/85 px-6 py-5 text-center shadow-sm backdrop-blur-sm dark:bg-neutral-900/85">
              <Type className="h-6 w-6 text-neutral-400" />
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                This space is empty
              </p>
              <p className="text-xs text-neutral-500">
                Use “Add text” to drop a message anywhere on the board.
              </p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-neutral-950/60">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
          </div>
        )}
      </div>
    </div>
  )
}
