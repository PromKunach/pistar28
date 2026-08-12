/**
 * Board content for an announcement: free-form text blocks placed on a fixed
 * canvas. Positions are stored relative (0–1) to the canvas so they survive
 * canvas size changes.
 *
 * Persistence is a local placeholder for now — swap the two functions at the
 * bottom for Supabase calls once the `announcement_boards` table exists.
 */

export const BOARD_WIDTH = 2400
export const BOARD_HEIGHT = 1600

export type BoardTextBlock = {
  id: string
  text: string
  /** 0–1, fraction of board width */
  x: number
  /** 0–1, fraction of board height */
  y: number
  /** 0–1, fraction of board width */
  width: number
  color: string
  fontSize: number
}

export type BoardContent = {
  blocks: BoardTextBlock[]
  updatedAt: string | null
}

export const EMPTY_BOARD: BoardContent = { blocks: [], updatedAt: null }

export const DEFAULT_BLOCK_COLOR = "#1f2937"
export const DEFAULT_BLOCK_FONT_SIZE = 18
export const DEFAULT_BLOCK_WIDTH = 260 / BOARD_WIDTH

export function createTextBlock(x: number, y: number): BoardTextBlock {
  return {
    id: crypto.randomUUID(),
    text: "",
    x,
    y,
    width: DEFAULT_BLOCK_WIDTH,
    color: DEFAULT_BLOCK_COLOR,
    fontSize: DEFAULT_BLOCK_FONT_SIZE,
  }
}

function storageKey(announcementId: string) {
  return `announcement-board:${announcementId}`
}

function isBlock(value: unknown): value is BoardTextBlock {
  if (!value || typeof value !== "object") return false
  const block = value as Record<string, unknown>
  return (
    typeof block.id === "string" &&
    typeof block.text === "string" &&
    typeof block.x === "number" &&
    typeof block.y === "number"
  )
}

// TODO(db): read from Supabase instead of localStorage.
export async function loadBoard(announcementId: string): Promise<BoardContent> {
  if (typeof window === "undefined") return EMPTY_BOARD

  try {
    const raw = window.localStorage.getItem(storageKey(announcementId))
    if (!raw) return EMPTY_BOARD

    const parsed = JSON.parse(raw) as Partial<BoardContent>
    const blocks = Array.isArray(parsed.blocks) ? parsed.blocks.filter(isBlock) : []

    return {
      blocks: blocks.map((block) => ({
        ...block,
        width: block.width || DEFAULT_BLOCK_WIDTH,
        color: block.color || DEFAULT_BLOCK_COLOR,
        fontSize: block.fontSize || DEFAULT_BLOCK_FONT_SIZE,
      })),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    }
  } catch {
    return EMPTY_BOARD
  }
}

// TODO(db): write to Supabase instead of localStorage.
export async function saveBoard(
  announcementId: string,
  blocks: BoardTextBlock[]
): Promise<BoardContent> {
  const content: BoardContent = { blocks, updatedAt: new Date().toISOString() }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey(announcementId), JSON.stringify(content))
  }

  return content
}
