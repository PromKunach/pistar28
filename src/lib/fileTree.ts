export type FileNodeType = "folder" | "file"

export type FileNode = {
  id: string
  parentId: string | null
  name: string
  type: FileNodeType
  driveUrl: string | null
  sortOrder: number
}

export type FileTree = {
  nodes: FileNode[]
  fetchedAt: string
}

const DRIVE_URL_PATTERN =
  /^https:\/\/(drive\.google\.com\/|docs\.google\.com\/)/i

export function isValidDriveUrl(url: string) {
  return DRIVE_URL_PATTERN.test(url.trim())
}

function normalizeParentId(value: string | undefined) {
  const trimmed = value?.trim() ?? ""
  return trimmed.length > 0 ? trimmed : null
}

function parseSortOrder(value: string | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function isFileNodeType(value: string): value is FileNodeType {
  return value === "folder" || value === "file"
}

export function parseSheetRows(rows: string[][]): FileNode[] {
  if (rows.length < 2) return []

  const dataRows = rows.slice(1)
  const parsed: FileNode[] = []
  const seenIds = new Set<string>()

  for (const row of dataRows) {
    const [idRaw, parentRaw, nameRaw, typeRaw, driveRaw, sortRaw] = row
    const id = idRaw?.trim() ?? ""
    const name = nameRaw?.trim() ?? ""
    const type = typeRaw?.trim() ?? ""

    if (!id || !name || !isFileNodeType(type)) continue
    if (seenIds.has(id)) continue

    const parentId = normalizeParentId(parentRaw)
    const sortOrder = parseSortOrder(sortRaw)
    const driveUrl = driveRaw?.trim() ?? ""

    if (type === "file") {
      if (!isValidDriveUrl(driveUrl)) continue
      parsed.push({ id, parentId, name, type, driveUrl, sortOrder })
      seenIds.add(id)
      continue
    }

    parsed.push({ id, parentId, name, type, driveUrl: null, sortOrder })
    seenIds.add(id)
  }

  const byId = new Map(parsed.map((node) => [node.id, node]))

  return parsed.filter((node) => {
    if (!node.parentId) return true
    const parent = byId.get(node.parentId)
    if (!parent || parent.type !== "folder") return false
    return true
  })
}

function sortNodes(nodes: FileNode[]) {
  return [...nodes].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.name.localeCompare(b.name, "th")
  })
}

export function findNode(nodes: FileNode[], id: string) {
  return nodes.find((node) => node.id === id) ?? null
}

export function getChildren(nodes: FileNode[], parentId: string | null) {
  return sortNodes(nodes.filter((node) => node.parentId === parentId))
}

export function getBreadcrumb(nodes: FileNode[], folderId: string | null) {
  if (!folderId) return []
  const trail: FileNode[] = []
  let current = findNode(nodes, folderId)
  while (current) {
    trail.unshift(current)
    current = current.parentId ? findNode(nodes, current.parentId) : null
  }
  return trail
}
