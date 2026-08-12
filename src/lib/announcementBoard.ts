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

export type BoardAuthor = {
  studentId: string
  displayName: string
  avatarUrl?: string
}

export type BoardTextBlock = {
  id: string
  text: string
  description: string
  /** 0–1, fraction of board width */
  x: number
  /** 0–1, fraction of board height */
  y: number
  /** 0–1, fraction of board width */
  width: number
  color: string
  fontSize: number
  author: BoardAuthor
  createdAt: string
}

export type BoardConnection = {
  id: string
  fromId: string
  toId: string
  createdAt: string
}

export type BoardContent = {
  blocks: BoardTextBlock[]
  connections: BoardConnection[]
  updatedAt: string | null
}

export const EMPTY_BOARD: BoardContent = {
  blocks: [],
  connections: [],
  updatedAt: null,
}

export const DEFAULT_BLOCK_COLOR = "#1f2937"
export const DEFAULT_BLOCK_FONT_SIZE = 18
export const DEFAULT_BLOCK_WIDTH = 260 / BOARD_WIDTH

export function createTextBlock(
  x: number,
  y: number,
  author: BoardAuthor
): BoardTextBlock {
  return {
    id: crypto.randomUUID(),
    text: "",
    description: "",
    x,
    y,
    width: DEFAULT_BLOCK_WIDTH,
    color: DEFAULT_BLOCK_COLOR,
    fontSize: DEFAULT_BLOCK_FONT_SIZE,
    author,
    createdAt: new Date().toISOString(),
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
        description: block.description ?? "",
        author: block.author ?? {
          studentId: "ไม่ระบุ",
          displayName: "ไม่ทราบชื่อ",
        },
        createdAt: block.createdAt || new Date().toISOString(),
      })),
      connections: Array.isArray(parsed.connections)
        ? parsed.connections.filter(
            (connection): connection is BoardConnection =>
              Boolean(
                connection &&
                  typeof connection === "object" &&
                  "id" in connection &&
                  "fromId" in connection &&
                  "toId" in connection
              )
          )
        : [],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    }
  } catch {
    return EMPTY_BOARD
  }
}

// TODO(db): write to Supabase instead of localStorage.
export async function saveBoard(
  announcementId: string,
  blocks: BoardTextBlock[],
  connections: BoardConnection[]
): Promise<BoardContent> {
  const content: BoardContent = {
    blocks,
    connections,
    updatedAt: new Date().toISOString(),
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey(announcementId), JSON.stringify(content))
  }

  return content
}
