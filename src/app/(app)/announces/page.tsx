"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react"
import {
  BellIcon,
  CalendarIcon,
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

import { cn } from "@/lib/utils"
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid"
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
}

const ICON_OPTIONS: { id: string; label: string; Icon: ElementType }[] = [
  { id: "file", label: "File", Icon: FileTextIcon },
  { id: "input", label: "Input", Icon: InputIcon },
  { id: "globe", label: "Globe", Icon: GlobeIcon },
  { id: "calendar", label: "Calendar", Icon: CalendarIcon },
  { id: "bell", label: "Bell", Icon: BellIcon },
  { id: "speaker", label: "Speaker", Icon: SpeakerLoudIcon },
  { id: "rocket", label: "Rocket", Icon: RocketIcon },
  { id: "star", label: "Star", Icon: StarIcon },
]

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

type NoteDraft = {
  name: string
  description: string
  iconId: string
}

function AddNoteDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (draft: NoteDraft) => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [iconId, setIconId] = useState(ICON_OPTIONS[0].id)

  useEffect(() => {
    if (!open) return

    setName("")
    setDescription("")
    setIconId(ICON_OPTIONS[0].id)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  const canSubmit = name.trim().length > 0

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Close dialog"
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
              if (!canSubmit) return
              onSubmit({ name: name.trim(), description: description.trim(), iconId })
            }}
            className="relative z-10 w-full max-w-md space-y-5 rounded-2xl border border-neutral-200 bg-background p-6 shadow-xl dark:border-neutral-800"
          >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
              New note
            </h2>
            <p className="text-sm text-neutral-500">
              This note is added to the top of the grid.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close"
          >
            <Cross2Icon />
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="note-name">Note name</Label>
          <Input
            id="note-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Weekly meeting"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="note-description">Note description</Label>
          <Input
            id="note-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Short summary of the note"
          />
        </div>

        <div className="space-y-2">
          <Label>Icon</Label>
          <div className="grid grid-cols-4 gap-2">
            {ICON_OPTIONS.map((option) => {
              const isSelected = option.id === iconId
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setIconId(option.id)}
                  aria-pressed={isSelected}
                  title={option.label}
                  className={cn(
                    "flex h-14 items-center justify-center rounded-lg border transition-colors",
                    isSelected
                      ? "border-neutral-800 bg-neutral-100 dark:border-neutral-200 dark:bg-neutral-800"
                      : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                  )}
                >
                  <option.Icon className="h-6 w-6 text-neutral-700 dark:text-neutral-300" />
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            Add note
          </Button>
        </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  )
}

export default function BentoDemo() {
  const [features, setFeatures] = useState(initialFeatures)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const nextIdRef = useRef(1)

  const addFeature = useCallback((draft: NoteDraft) => {
    setFeatures((current) => {
      const { items, placement } = placeAtTop(current)
      const Icon =
        ICON_OPTIONS.find((option) => option.id === draft.iconId)?.Icon ??
        ICON_OPTIONS[0].Icon

      const newItem: BentoFeature = {
        id: `note-${nextIdRef.current++}`,
        Icon,
        name: draft.name,
        description: draft.description,
        href: "/announces",
        cta: "Learn more",
        background: (
          <img alt="" className="absolute -top-20 -right-20 opacity-60" />
        ),
        placement,
      }

      return [newItem, ...items]
    })
    setIsDialogOpen(false)
  }, [])

  return (
    <div className="container space-y-4 p-[20px] no-scrollbar">
      <div className="flex items-center justify-between gap-4 no-scrollbar">
        <div className="no-scrollbar">
          <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200">
            Announcements
          </h1>
          <p className="text-sm text-neutral-500">
            New tiles are added to the top — older ones shift down.
          </p>
        </div>
        <Button type="button" onClick={() => setIsDialogOpen(true)}>
          <PlusIcon className="me-2 h-4 w-4" />
          Add tile
        </Button>
      </div>

      <BentoGrid className="lg:grid-cols-4">
        {features.map((feature) => (
          <BentoCard key={feature.id} {...feature} />
        ))}
      </BentoGrid>

      <AddNoteDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={addFeature}
      />
    </div>
  )
}
