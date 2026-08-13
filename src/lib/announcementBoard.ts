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

export type BoardBlockLink = {
  id: string
  name: string
  url: string
  /** Offset from the default link node position (board width fraction). */
  offsetX: number
  /** Offset from the default link node position (board height fraction). */
  offsetY: number
}

export type BoardBlockKind = "text" | "counter" | "comment" | "link" | "dock"

export type BoardCounterIncrement = {
  id: string
  user: BoardAuthor
  at: string
}

export type BoardCommentEntry = {
  id: string
  text: string
  /** JPEG/PNG/WebP as a data URL, capped when added in the UI. */
  imageDataUrl?: string
  user?: BoardAuthor
  at: string
}

type BoardBlockShared = {
  id: string
  /** 0–1, fraction of board width */
  x: number
  /** 0–1, fraction of board height */
  y: number
  /** 0–1, fraction of board width */
  width: number
  author: BoardAuthor
  createdAt: string
}

export type BoardTextBlock = BoardBlockShared & {
  kind?: "text"
  text: string
  description: string
  color: string
  fontSize: number
}

export type BoardLinkBlock = BoardBlockShared & {
  kind: "link"
  name: string
  url: string
}

export type BoardCounterBlock = BoardBlockShared & {
  kind: "counter"
  name: string
  value: number
  increments: BoardCounterIncrement[]
}

export type BoardCommentBlock = BoardBlockShared & {
  kind: "comment"
  title: string
  comments: BoardCommentEntry[]
  color: string
  fontSize: number
}

export type DockSnapSide = "above" | "below"

export type BoardDockBlock = BoardBlockShared & {
  kind: "dock"
  dockedBlockIds: string[]
  /** Block id when snapped to a normal node */
  snapToId: string | null
  /** Whether the dock sits above or below snapToId */
  snapSide: DockSnapSide | null
}

export type BoardBlock =
  | BoardTextBlock
  | BoardCounterBlock
  | BoardCommentBlock
  | BoardLinkBlock
  | BoardDockBlock

export type BoardConnection = {
  id: string
  fromId: string
  toId: string
  createdAt: string
}

export type BoardContent = {
  blocks: BoardBlock[]
  connections: BoardConnection[]
  updatedAt: string | null
}

export type AnnouncementBoardRecord = {
  announcement_id: string
  blocks: BoardBlock[]
  connections: BoardConnection[]
  updated_at: string
}

export type SaveBoardInput = {
  announcementId: string
  blocks: BoardBlock[]
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
export const DEFAULT_COUNTER_WIDTH = 220 / BOARD_WIDTH
export const DEFAULT_COMMENT_WIDTH = 320 / BOARD_WIDTH
export const DEFAULT_DOCK_WIDTH = DEFAULT_BLOCK_WIDTH
export const LINK_NODE_SIZE = 52
/** Layout width for link node connection anchors and drag bounds. */
export const LINK_NODE_LAYOUT_WIDTH = 224 / BOARD_WIDTH
export const DEFAULT_LINK_WIDTH = LINK_NODE_LAYOUT_WIDTH

/** Max encoded image size stored on a comment (512 KB). */
export const COMMENT_IMAGE_MAX_BYTES = 512 * 1024

/** Longest side after compression before encoding. */
export const COMMENT_IMAGE_MAX_DIMENSION = 1200

export function isTextBlock(block: BoardBlock): block is BoardTextBlock {
  return !block.kind || block.kind === "text"
}

export function isCounterBlock(block: BoardBlock): block is BoardCounterBlock {
  return block.kind === "counter"
}

export function isCommentBlock(block: BoardBlock): block is BoardCommentBlock {
  return block.kind === "comment"
}

export function isLinkBlock(block: BoardBlock): block is BoardLinkBlock {
  return block.kind === "link"
}

export function isDockBlock(block: BoardBlock): block is BoardDockBlock {
  return block.kind === "dock"
}

/** "all" = any logged-in user; "author" = only the block author */
export type BoardEditMode = "all" | "author"
export const BOARD_EDIT_MODE: BoardEditMode = "all"

export type BoardEditorUser = {
  studentId: string
}

export function canEditBlock(
  block: BoardBlock,
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
    kind: "text",
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

export function createCounterBlock(
  x: number,
  y: number,
  author: BoardAuthor
): BoardCounterBlock {
  return {
    id: crypto.randomUUID(),
    kind: "counter",
    name: "ตัวนับ",
    value: 0,
    increments: [],
    x,
    y,
    width: DEFAULT_COUNTER_WIDTH,
    author,
    createdAt: new Date().toISOString(),
  }
}

export function createCommentBlock(
  x: number,
  y: number,
  author: BoardAuthor
): BoardCommentBlock {
  return {
    id: crypto.randomUUID(),
    kind: "comment",
    title: "",
    comments: [],
    x,
    y,
    width: DEFAULT_COMMENT_WIDTH,
    color: DEFAULT_BLOCK_COLOR,
    fontSize: DEFAULT_BLOCK_FONT_SIZE,
    author,
    createdAt: new Date().toISOString(),
  }
}

export function createLinkBlock(
  x: number,
  y: number,
  author: BoardAuthor
): BoardLinkBlock {
  return {
    id: crypto.randomUUID(),
    kind: "link",
    name: "",
    url: "",
    x,
    y,
    width: DEFAULT_LINK_WIDTH,
    author,
    createdAt: new Date().toISOString(),
  }
}

export function createDockBlock(
  x: number,
  y: number,
  author: BoardAuthor
): BoardDockBlock {
  return {
    id: crypto.randomUUID(),
    kind: "dock",
    dockedBlockIds: [],
    snapToId: null,
    snapSide: null,
    x,
    y,
    width: DEFAULT_DOCK_WIDTH,
    author,
    createdAt: new Date().toISOString(),
  }
}

function isBlockLink(value: unknown): value is BoardBlockLink {
  if (!value || typeof value !== "object") return false
  const link = value as Record<string, unknown>
  return (
    typeof link.id === "string" &&
    typeof link.name === "string" &&
    typeof link.url === "string"
  )
}

function normalizeBlockLinks(block: Record<string, unknown>): BoardBlockLink[] {
  if (Array.isArray(block.links)) {
    return block.links.filter(isBlockLink).map((link) => ({
      id: link.id,
      name: link.name,
      url: link.url,
      offsetX: typeof link.offsetX === "number" ? link.offsetX : 0,
      offsetY: typeof link.offsetY === "number" ? link.offsetY : 0,
    }))
  }

  const legacyLink = typeof block.link === "string" ? block.link.trim() : ""
  if (!legacyLink) return []

  return [
    {
      id: crypto.randomUUID(),
      name: legacyLink,
      url: legacyLink,
      offsetX: typeof block.linkNodeOffsetX === "number" ? block.linkNodeOffsetX : 0,
      offsetY: typeof block.linkNodeOffsetY === "number" ? block.linkNodeOffsetY : 0,
    },
  ]
}

function isCounterIncrement(value: unknown): value is BoardCounterIncrement {
  if (!value || typeof value !== "object") return false
  const entry = value as Record<string, unknown>
  return typeof entry.id === "string" && typeof entry.at === "string"
}

function isBlock(value: unknown): value is BoardBlock {
  if (!value || typeof value !== "object") return false
  const block = value as Record<string, unknown>
  if (
    typeof block.id !== "string" ||
    typeof block.x !== "number" ||
    typeof block.y !== "number"
  ) {
    return false
  }
  if (block.kind === "counter") {
    return typeof block.name === "string" && typeof block.value === "number"
  }
  if (block.kind === "comment") {
    return typeof block.title === "string"
  }
  if (block.kind === "link") {
    return true
  }
  if (block.kind === "dock") {
    return true
  }
  return typeof block.text === "string"
}

function normalizeCounterIncrements(raw: unknown): BoardCounterIncrement[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  return raw
    .filter(isCounterIncrement)
    .map((entry) => ({
      id: entry.id,
      at: entry.at,
      user: entry.user ?? {
        studentId: "ไม่ระบุ",
        displayName: "ไม่ทราบชื่อ",
      },
    }))
    .filter((entry) => {
      const studentId = entry.user.studentId
      if (seen.has(studentId)) return false
      seen.add(studentId)
      return true
    })
}

function isCommentEntry(value: unknown): value is BoardCommentEntry {
  if (!value || typeof value !== "object") return false
  const entry = value as Record<string, unknown>
  return typeof entry.id === "string" && typeof entry.text === "string"
}

function normalizeCommentEntries(raw: unknown): BoardCommentEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(isCommentEntry).map((entry) => ({
    id: entry.id,
    text: entry.text,
    imageDataUrl:
      typeof entry.imageDataUrl === "string" ? entry.imageDataUrl : undefined,
    user: entry.user ?? undefined,
    at: entry.at || new Date().toISOString(),
  }))
}

function normalizeCommentBlock(block: BoardCommentBlock): BoardCommentBlock {
  return {
    ...block,
    kind: "comment",
    title: block.title ?? "",
    comments: normalizeCommentEntries(block.comments),
    width: DEFAULT_COMMENT_WIDTH,
    color: block.color || DEFAULT_BLOCK_COLOR,
    fontSize: block.fontSize || DEFAULT_BLOCK_FONT_SIZE,
    author: block.author ?? {
      studentId: "ไม่ระบุ",
      displayName: "ไม่ทราบชื่อ",
    },
    createdAt: block.createdAt || new Date().toISOString(),
  }
}

function normalizeTextBlock(block: BoardTextBlock): BoardTextBlock {
  const {
    links: _links,
    link: _link,
    linkNodeOffsetX: _linkNodeOffsetX,
    linkNodeOffsetY: _linkNodeOffsetY,
    kind: _kind,
    ...rest
  } = block as BoardTextBlock & Record<string, unknown>

  return {
    ...(rest as BoardTextBlock),
    kind: "text",
    width: block.width || DEFAULT_BLOCK_WIDTH,
    color: block.color || DEFAULT_BLOCK_COLOR,
    fontSize: block.fontSize || DEFAULT_BLOCK_FONT_SIZE,
    description: block.description ?? "",
    author: block.author ?? {
      studentId: "ไม่ระบุ",
      displayName: "ไม่ทราบชื่อ",
    },
    createdAt: block.createdAt || new Date().toISOString(),
  }
}

function normalizeLinkBlock(block: BoardLinkBlock): BoardLinkBlock {
  const raw = block as BoardLinkBlock & Record<string, unknown>
  const legacyTitle = typeof raw.title === "string" ? raw.title : ""
  const name =
    typeof block.name === "string" && block.name.length > 0
      ? block.name
      : legacyTitle

  return {
    id: block.id,
    kind: "link",
    name,
    url: typeof block.url === "string" ? block.url : "",
    x: block.x,
    y: block.y,
    width: DEFAULT_LINK_WIDTH,
    author: block.author ?? {
      studentId: "ไม่ระบุ",
      displayName: "ไม่ทราบชื่อ",
    },
    createdAt: block.createdAt || new Date().toISOString(),
  }
}

const LEGACY_LINK_NODE_OFFSET = 56
const LEGACY_LINK_NODE_GAP = 20
const LEGACY_BLOCK_HEIGHT = 128

function legacyLinkNodeCenter(
  blockX: number,
  blockY: number,
  blockWidth: number,
  link: BoardBlockLink,
  linkIndex: number,
  linkCount: number
): { x: number; y: number } {
  const rectX = blockX * BOARD_WIDTH
  const rectY = blockY * BOARD_HEIGHT
  const rectW = blockWidth * BOARD_WIDTH
  const baseX = rectX + rectW + LEGACY_LINK_NODE_OFFSET + LINK_NODE_SIZE / 2
  const centerY = rectY + LEGACY_BLOCK_HEIGHT / 2
  const spacing = LINK_NODE_SIZE + LEGACY_LINK_NODE_GAP
  const offsetIndex = linkIndex - (linkCount - 1) / 2

  return {
    x: baseX + link.offsetX * BOARD_WIDTH,
    y: centerY + offsetIndex * spacing + link.offsetY * BOARD_HEIGHT,
  }
}

function linkNodeTopLeftFromCenter(centerX: number, centerY: number) {
  return {
    x: (centerX - LINK_NODE_SIZE / 2) / BOARD_WIDTH,
    y: (centerY - LINK_NODE_SIZE / 2) / BOARD_HEIGHT,
  }
}

function expandLegacyLinkBlock(item: BoardLinkBlock): BoardLinkBlock[] {
  const raw = item as BoardLinkBlock & Record<string, unknown>
  const hasNewShape =
    typeof raw.name === "string" &&
    typeof raw.url === "string" &&
    !Array.isArray(raw.links)

  if (hasNewShape) {
    return [normalizeLinkBlock(item)]
  }

  const links = normalizeBlockLinks(raw)
  if (links.length === 0) {
    return [normalizeLinkBlock(item)]
  }

  return links.map((link, linkIndex) => {
    const center = legacyLinkNodeCenter(
      item.x,
      item.y,
      item.width || DEFAULT_LINK_WIDTH,
      link,
      linkIndex,
      links.length
    )
    const pos = linkNodeTopLeftFromCenter(center.x, center.y)

    return normalizeLinkBlock({
      id: links.length === 1 ? item.id : crypto.randomUUID(),
      kind: "link",
      name: link.name,
      url: link.url,
      x: pos.x,
      y: pos.y,
      width: DEFAULT_LINK_WIDTH,
      author: item.author,
      createdAt: item.createdAt,
    })
  })
}

function legacyTextLinksToLinkBlocks(
  textBlock: BoardTextBlock,
  links: BoardBlockLink[]
): BoardLinkBlock[] {
  const blockWidth = textBlock.width || DEFAULT_BLOCK_WIDTH

  return links.map((link, linkIndex) => {
    const center = legacyLinkNodeCenter(
      textBlock.x,
      textBlock.y,
      blockWidth,
      link,
      linkIndex,
      links.length
    )
    const pos = linkNodeTopLeftFromCenter(center.x, center.y)

    return normalizeLinkBlock({
      id: crypto.randomUUID(),
      kind: "link",
      name: link.name,
      url: link.url,
      x: pos.x,
      y: pos.y,
      width: DEFAULT_LINK_WIDTH,
      author: textBlock.author,
      createdAt: textBlock.createdAt,
    })
  })
}

function normalizeDockBlock(block: BoardDockBlock): BoardDockBlock {
  const raw = block as BoardDockBlock & Record<string, unknown>
  const dockedBlockIds = Array.isArray(raw.dockedBlockIds)
    ? raw.dockedBlockIds.filter((id): id is string => typeof id === "string")
    : []

  const snapToId = typeof raw.snapToId === "string" ? raw.snapToId : null
  const snapSide =
    raw.snapSide === "above" || raw.snapSide === "below"
      ? raw.snapSide
      : snapToId
        ? "above"
        : null

  return {
    id: block.id,
    kind: "dock",
    dockedBlockIds,
    snapToId,
    snapSide,
    x: block.x,
    y: block.y,
    width: DEFAULT_DOCK_WIDTH,
    author: block.author ?? {
      studentId: "ไม่ระบุ",
      displayName: "ไม่ทราบชื่อ",
    },
    createdAt: block.createdAt || new Date().toISOString(),
  }
}

function normalizeCounterBlock(block: BoardCounterBlock): BoardCounterBlock {
  const increments = normalizeCounterIncrements(block.increments)
  return {
    ...block,
    kind: "counter",
    name: block.name ?? "ตัวนับ",
    increments,
    value: increments.length,
    width: DEFAULT_COUNTER_WIDTH,
    author: block.author ?? {
      studentId: "ไม่ระบุ",
      displayName: "ไม่ทราบชื่อ",
    },
    createdAt: block.createdAt || new Date().toISOString(),
  }
}

/** Ensures counter blocks use the canonical width before persisting. */
export function normalizeBoardBlocksForSave(blocks: BoardBlock[]): BoardBlock[] {
  return blocks.map((block) => {
    if (isCounterBlock(block)) return { ...block, width: DEFAULT_COUNTER_WIDTH }
    if (isCommentBlock(block)) return { ...block, width: DEFAULT_COMMENT_WIDTH }
    if (isLinkBlock(block)) return { ...block, width: DEFAULT_LINK_WIDTH }
    if (isDockBlock(block)) return { ...block, width: DEFAULT_DOCK_WIDTH }
    return block
  })
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

export function normalizeBlocks(raw: unknown): BoardBlock[] {
  if (!Array.isArray(raw)) return []

  const result: BoardBlock[] = []
  const seenBlockIds = new Set<string>()

  for (const item of raw) {
    if (!isBlock(item)) continue

    if (isCounterBlock(item)) {
      result.push(normalizeCounterBlock(item))
      continue
    }
    if (isCommentBlock(item)) {
      result.push(normalizeCommentBlock(item))
      continue
    }
    if (isLinkBlock(item)) {
      for (const linkBlock of expandLegacyLinkBlock(item)) {
        if (seenBlockIds.has(linkBlock.id)) continue
        seenBlockIds.add(linkBlock.id)
        result.push(linkBlock)
      }
      continue
    }
    if (isDockBlock(item)) {
      const normalized = normalizeDockBlock(item)
      if (seenBlockIds.has(normalized.id)) continue
      seenBlockIds.add(normalized.id)
      result.push(normalized)
      continue
    }

    const textBlock = normalizeTextBlock(item)
    result.push(textBlock)

    const shouldMigrateLegacyLinks = item.kind !== "text"
    const legacyLinks = shouldMigrateLegacyLinks
      ? normalizeBlockLinks(item as Record<string, unknown>)
      : []

    if (legacyLinks.length > 0) {
      for (const linkBlock of legacyTextLinksToLinkBlocks(textBlock, legacyLinks)) {
        if (seenBlockIds.has(linkBlock.id)) continue
        seenBlockIds.add(linkBlock.id)
        result.push(linkBlock)
      }
    }
  }

  return result
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
