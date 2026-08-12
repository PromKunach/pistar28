/**
 * Board content for an announcement: free-form text blocks placed on a fixed
 * canvas. Positions are stored relative (0–1) to the canvas so they survive
 * canvas size changes.
 *
 * Persisted in Supabase `announcement_boards` (one row per announcement).
 */

import { supabase } from "@/lib/supabaseClient"

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

export type AnnouncementBoardRecord = {
  announcement_id: string
  blocks: BoardTextBlock[]
  connections: BoardConnection[]
  updated_at: string
}

export type SaveBoardInput = {
  announcementId: string
  blocks: BoardTextBlock[]
  connections: BoardConnection[]
}

export const EMPTY_BOARD: BoardContent = {
  blocks: [],
  connections: [],
  updatedAt: null,
}

export const DEFAULT_BLOCK_COLOR = "#1f2937"
export const DEFAULT_BLOCK_FONT_SIZE = 18
export const DEFAULT_BLOCK_WIDTH = 260 / BOARD_WIDTH

/** "all" = any logged-in user; "author" = only the block author */
export type BoardEditMode = "all" | "author"
export const BOARD_EDIT_MODE: BoardEditMode = "all"

export type BoardEditorUser = {
  studentId: string
}

export function canEditBlock(
  block: BoardTextBlock,
  user: BoardEditorUser | null | undefined
): boolean {
  if (!user) return false
  if (BOARD_EDIT_MODE === "all") return true
  return block.author.studentId === user.studentId
}

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

function isConnection(value: unknown): value is BoardConnection {
  if (!value || typeof value !== "object") return false
  const connection = value as Record<string, unknown>
  return (
    typeof connection.id === "string" &&
    typeof connection.fromId === "string" &&
    typeof connection.toId === "string"
  )
}

export function normalizeBlocks(raw: unknown): BoardTextBlock[] {
  if (!Array.isArray(raw)) return []

  return raw.filter(isBlock).map((block) => ({
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
  }))
}

export function normalizeConnections(raw: unknown): BoardConnection[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(isConnection).map((connection) => ({
    ...connection,
    createdAt: connection.createdAt || new Date().toISOString(),
  }))
}

export function recordToBoardContent(record: AnnouncementBoardRecord): BoardContent {
  return {
    blocks: normalizeBlocks(record.blocks),
    connections: normalizeConnections(record.connections),
    updatedAt: record.updated_at ?? null,
  }
}

export async function fetchBoard(
  announcementId: string
): Promise<AnnouncementBoardRecord | null> {
  const { data, error } = await supabase
    .from("announcement_boards")
    .select("announcement_id, blocks, connections, updated_at")
    .eq("announcement_id", announcementId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    announcement_id: data.announcement_id,
    blocks: normalizeBlocks(data.blocks),
    connections: normalizeConnections(data.connections),
    updated_at: data.updated_at,
  }
}

export async function createBoard(
  input: SaveBoardInput
): Promise<AnnouncementBoardRecord> {
  const { data, error } = await supabase
    .from("announcement_boards")
    .insert({
      announcement_id: input.announcementId,
      blocks: input.blocks,
      connections: input.connections,
    })
    .select("announcement_id, blocks, connections, updated_at")
    .single()

  if (error) throw error

  return {
    announcement_id: data.announcement_id,
    blocks: normalizeBlocks(data.blocks),
    connections: normalizeConnections(data.connections),
    updated_at: data.updated_at,
  }
}

export async function updateBoard(
  input: SaveBoardInput
): Promise<AnnouncementBoardRecord> {
  const { data, error } = await supabase
    .from("announcement_boards")
    .update({
      blocks: input.blocks,
      connections: input.connections,
      updated_at: new Date().toISOString(),
    })
    .eq("announcement_id", input.announcementId)
    .select("announcement_id, blocks, connections, updated_at")
    .single()

  if (error) throw error

  return {
    announcement_id: data.announcement_id,
    blocks: normalizeBlocks(data.blocks),
    connections: normalizeConnections(data.connections),
    updated_at: data.updated_at,
  }
}
