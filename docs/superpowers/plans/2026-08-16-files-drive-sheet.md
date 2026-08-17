# Files Page (Google Sheet + Drive) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/files` as a read-only folder browser backed by a Google Sheet (folders + Drive URLs), fetched server-side on each page load.

**Architecture:** Committee edits a private Google Sheet. A Next.js Route Handler (`GET /api/files/tree`) authenticates with a Google service account, fetches tab `files`, parses rows into `FileNode[]`, and caches in memory for 180 seconds. The client page reads `?folder=` from the URL, renders list rows (folders first, then files), and opens Drive links in a new tab.

**Tech Stack:** Next.js 16.3 App Router, React 19, `googleapis` npm package, Vitest, lucide-react icons

## Global Constraints

- Thai UI copy for all user-facing labels and errors
- Content source: single Google Sheet tab named **`files`** (override via `FILES_SHEET_TAB`)
- Sheet columns: **`id`**, **`parent_id`**, **`name`**, **`type`**, **`drive_url`**, **`sort_order`**
- `type` values: **`folder`** or **`file`** only
- Files require non-empty **`drive_url`**; folders ignore `drive_url`
- Sync: fetch Sheet on every `/files` page load via **`GET /api/files/tree`**
- In-memory cache TTL: **`180`** seconds (`FILES_CACHE_TTL_SECONDS`, default `180`)
- Layout: full-width **list rows** (icon + name + chevron/link)
- Navigation: **`?folder={id}`** query param; breadcrumb trail
- Files open Drive URL in new tab with **`noopener,noreferrer`**
- No user uploads; remove sidebar link **อัปโหลดใหม่**
- Service account JSON **server-only** — never import in client components
- Invalid `?folder=` → show root (ignore bad id)
- Skip invalid Sheet rows (orphan parent, duplicate id, missing fields) — do not crash
- Max content width ~**800px** centered
- Dark mode compatible (`neutral` palette, `rounded-xl` rows)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `package.json` | Modify | Add `googleapis` dependency |
| `.env.example` | Modify | Document `GOOGLE_SHEETS_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `FILES_SHEET_TAB`, `FILES_CACHE_TTL_SECONDS` |
| `src/lib/fileTree.ts` | Create | Types, parse rows, tree helpers |
| `src/lib/fileTree.test.ts` | Create | Unit tests for parse + tree |
| `src/lib/googleSheets.ts` | Create | Service account auth + fetch values |
| `src/app/api/files/tree/route.ts` | Create | API route + memory cache |
| `src/app/(app)/files/FileListRow.tsx` | Create | Single list row |
| `src/app/(app)/files/page.tsx` | Modify | Folder browser page |
| `src/components/Sidebar.tsx` | Modify | Remove upload sub-link |

---

## Google Cloud Setup (do before Task 4 manual QA)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create/select project
2. Enable **Google Sheets API**
3. IAM → Service Accounts → Create → download JSON key
4. Copy service account email (e.g. `files-reader@project.iam.gserviceaccount.com`)
5. Open your Google Sheet → Share → add service account email as **Viewer**
6. Copy Spreadsheet ID from URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
7. Add to `.env.local`:

```env
GOOGLE_SHEETS_ID=your_spreadsheet_id_here
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
FILES_SHEET_TAB=files
FILES_CACHE_TTL_SECONDS=180
```

**Note:** `GOOGLE_SERVICE_ACCOUNT_JSON` must be a single-line JSON string. For multiline private keys, escape `\n` in the key field.

**Sample Sheet data** (row 1 = header):

```
id       parent_id  name            type    drive_url                               sort_order
f-root              เอกสารประชุม     folder                                          1
f-2568   f-root     ปี 2568         folder                                          1
doc-jan  f-2568     รายงาน ม.ค.     file    https://drive.google.com/file/d/XXX/view  1
```

---

### Task 1: Install googleapis + env documentation

**Files:**
- Modify: `package.json`
- Modify: `.env.example` (create if missing)

**Interfaces:**
- Produces: `googleapis` package available for import

- [ ] **Step 1: Install dependency**

```bash
cd pistar28
npm install googleapis
```

- [ ] **Step 2: Add env vars to `.env.example`**

```env
# Google Sheets — files page (server-only)
GOOGLE_SHEETS_ID=
GOOGLE_SERVICE_ACCOUNT_JSON=
FILES_SHEET_TAB=files
FILES_CACHE_TTL_SECONDS=180
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore(files): add googleapis dependency and env example"
```

---

### Task 2: File tree parsing and helpers

**Files:**
- Create: `src/lib/fileTree.ts`
- Create: `src/lib/fileTree.test.ts`

**Interfaces:**
- Produces:
  - `export type FileNodeType = "folder" | "file"`
  - `export type FileNode = { id: string; parentId: string | null; name: string; type: FileNodeType; driveUrl: string | null; sortOrder: number }`
  - `export type FileTree = { nodes: FileNode[]; fetchedAt: string }`
  - `export function parseSheetRows(rows: string[][]): FileNode[]`
  - `export function getChildren(nodes: FileNode[], parentId: string | null): FileNode[]`
  - `export function getBreadcrumb(nodes: FileNode[], folderId: string | null): FileNode[]`
  - `export function findNode(nodes: FileNode[], id: string): FileNode | null`
  - `export function isValidDriveUrl(url: string): boolean`

- [ ] **Step 1: Write failing tests**

Create `src/lib/fileTree.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import {
  getBreadcrumb,
  getChildren,
  parseSheetRows,
} from "./fileTree"

const HEADER = ["id", "parent_id", "name", "type", "drive_url", "sort_order"]

describe("parseSheetRows", () => {
  it("parses valid folder and file rows", () => {
    const rows = [
      HEADER,
      ["f-root", "", "เอกสารประชุม", "folder", "", "1"],
      ["f-2568", "f-root", "ปี 2568", "folder", "", "1"],
      [
        "doc-jan",
        "f-2568",
        "รายงาน ม.ค.",
        "file",
        "https://drive.google.com/file/d/abc/view",
        "1",
      ],
    ]
    const nodes = parseSheetRows(rows)
    expect(nodes).toHaveLength(3)
    expect(nodes[0]).toMatchObject({ id: "f-root", parentId: null, type: "folder" })
    expect(nodes[2]).toMatchObject({ id: "doc-jan", type: "file", sortOrder: 1 })
  })

  it("skips file rows without drive_url", () => {
    const rows = [
      HEADER,
      ["bad-file", "", "Missing URL", "file", "", "1"],
    ]
    expect(parseSheetRows(rows)).toHaveLength(0)
  })

  it("skips orphan parent_id rows", () => {
    const rows = [
      HEADER,
      ["orphan", "missing-parent", "Orphan", "folder", "", "1"],
    ]
    expect(parseSheetRows(rows)).toHaveLength(0)
  })

  it("skips duplicate ids (keeps first)", () => {
    const rows = [
      HEADER,
      ["dup", "", "First", "folder", "", "1"],
      ["dup", "", "Second", "folder", "", "2"],
    ]
    const nodes = parseSheetRows(rows)
    expect(nodes).toHaveLength(1)
    expect(nodes[0]?.name).toBe("First")
  })
})

describe("getChildren", () => {
  const nodes = parseSheetRows([
    HEADER,
    ["f-root", "", "Root", "folder", "", "2"],
    ["f-child", "f-root", "Child", "folder", "", "1"],
    ["f-root-2", "", "Root 2", "folder", "", "1"],
  ])

  it("returns root folders sorted by sortOrder", () => {
    const children = getChildren(nodes, null)
    expect(children.map((n) => n.id)).toEqual(["f-root-2", "f-root"])
  })

  it("returns nested children", () => {
    const children = getChildren(nodes, "f-root")
    expect(children.map((n) => n.id)).toEqual(["f-child"])
  })
})

describe("getBreadcrumb", () => {
  const nodes = parseSheetRows([
    HEADER,
    ["f-root", "", "Root", "folder", "", "1"],
    ["f-child", "f-root", "Child", "folder", "", "1"],
  ])

  it("builds ancestor chain", () => {
    const trail = getBreadcrumb(nodes, "f-child")
    expect(trail.map((n) => n.id)).toEqual(["f-root", "f-child"])
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/lib/fileTree.test.ts
```

Expected: FAIL — module `./fileTree` not found

- [ ] **Step 3: Implement `src/lib/fileTree.ts`**

```typescript
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
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/lib/fileTree.test.ts
```

Expected: 4 tests passed

- [ ] **Step 5: Commit**

```bash
git add src/lib/fileTree.ts src/lib/fileTree.test.ts
git commit -m "feat(files): add file tree parsing helpers"
```

---

### Task 3: Google Sheets fetch module

**Files:**
- Create: `src/lib/googleSheets.ts`

**Interfaces:**
- Consumes: `parseSheetRows` from `src/lib/fileTree.ts`
- Produces:
  - `export async function fetchFileNodesFromSheet(): Promise<{ nodes: FileNode[]; fetchedAt: string }>`
  - `export function getGoogleSheetsConfig(): { spreadsheetId: string; sheetTab: string; cacheTtlSeconds: number }`

- [ ] **Step 1: Implement `src/lib/googleSheets.ts`**

```typescript
import { google } from "googleapis"

import { parseSheetRows, type FileNode } from "@/lib/fileTree"

function parseServiceAccountJson(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is empty")
  try {
    return JSON.parse(trimmed) as {
      client_email: string
      private_key: string
    }
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is invalid JSON")
  }
}

export function getGoogleSheetsConfig() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID?.trim() ?? ""
  const sheetTab = process.env.FILES_SHEET_TAB?.trim() || "files"
  const cacheTtlSeconds = Number(process.env.FILES_CACHE_TTL_SECONDS ?? "180")

  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_ID is not configured")
  }

  return {
    spreadsheetId,
    sheetTab,
    cacheTtlSeconds: Number.isFinite(cacheTtlSeconds) ? cacheTtlSeconds : 180,
  }
}

export async function fetchFileNodesFromSheet(): Promise<{
  nodes: FileNode[]
  fetchedAt: string
}> {
  const { spreadsheetId, sheetTab } = getGoogleSheetsConfig()
  const credentialsRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!credentialsRaw) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not configured")
  }

  const credentials = parseServiceAccountJson(credentialsRaw)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  })

  const sheets = google.sheets({ version: "v4", auth })
  const range = `${sheetTab}!A:F`

  let response
  try {
    response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes("403") || message.toLowerCase().includes("permission")) {
      throw new Error("ตรวจสอบการแชร์ Sheet กับ service account")
    }
    throw error
  }

  const rows = (response.data.values ?? []) as string[][]
  const nodes = parseSheetRows(rows)

  return {
    nodes,
    fetchedAt: new Date().toISOString(),
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/googleSheets.ts
git commit -m "feat(files): add Google Sheets fetch module"
```

---

### Task 4: API route with memory cache

**Files:**
- Create: `src/app/api/files/tree/route.ts`

**Interfaces:**
- Consumes: `fetchFileNodesFromSheet`, `getGoogleSheetsConfig`
- Produces: `GET /api/files/tree` → `{ nodes, fetchedAt }` JSON

- [ ] **Step 1: Create route handler**

Create `src/app/api/files/tree/route.ts`:

```typescript
import { NextResponse } from "next/server"

import type { FileNode } from "@/lib/fileTree"
import { fetchFileNodesFromSheet, getGoogleSheetsConfig } from "@/lib/googleSheets"

type CacheEntry = {
  nodes: FileNode[]
  fetchedAt: string
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

function getCacheKey(spreadsheetId: string, sheetTab: string) {
  return `${spreadsheetId}:${sheetTab}`
}

export async function GET() {
  try {
    const { spreadsheetId, sheetTab, cacheTtlSeconds } = getGoogleSheetsConfig()
    const cacheKey = getCacheKey(spreadsheetId, sheetTab)
    const now = Date.now()
    const cached = cache.get(cacheKey)

    if (cached && cached.expiresAt > now) {
      return NextResponse.json({
        nodes: cached.nodes,
        fetchedAt: cached.fetchedAt,
        cached: true,
      })
    }

    const result = await fetchFileNodesFromSheet()
    cache.set(cacheKey, {
      nodes: result.nodes,
      fetchedAt: result.fetchedAt,
      expiresAt: now + cacheTtlSeconds * 1000,
    })

    return NextResponse.json({ ...result, cached: false })
  } catch (error) {
    console.error("[files/tree]", error)
    const message =
      error instanceof Error && error.message
        ? error.message
        : "โหลดเอกสารไม่สำเร็จ"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Smoke test API (requires env configured)**

```bash
npm run dev
```

Open: `http://localhost:3000/api/files/tree`

Expected: JSON `{ nodes: [...], fetchedAt: "...", cached: false }`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/files/tree/route.ts
git commit -m "feat(files): add files tree API route with cache"
```

---

### Task 5: FileListRow component

**Files:**
- Create: `src/app/(app)/files/FileListRow.tsx`

**Interfaces:**
- Produces: `FileListRow({ node, onOpenFolder, onOpenFile })`

- [ ] **Step 1: Create component**

```typescript
"use client"

import { ChevronRight, ExternalLink, FileText, Folder } from "lucide-react"

import type { FileNode } from "@/lib/fileTree"
import { cn } from "@/lib/utils"

export function FileListRow({
  node,
  onOpenFolder,
  onOpenFile,
}: {
  node: FileNode
  onOpenFolder: (id: string) => void
  onOpenFile: (url: string) => void
}) {
  const isFolder = node.type === "folder"

  return (
    <button
      type="button"
      onClick={() => {
        if (isFolder) onOpenFolder(node.id)
        else if (node.driveUrl) onOpenFile(node.driveUrl)
      }}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left",
        "transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800/80"
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
        {isFolder ? <Folder className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
        {node.name}
      </span>
      {isFolder ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
      ) : (
        <ExternalLink className="h-4 w-4 shrink-0 text-neutral-400" />
      )}
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/files/FileListRow.tsx
git commit -m "feat(files): add FileListRow component"
```

---

### Task 6: Files page UI

**Files:**
- Modify: `src/app/(app)/files/page.tsx` (replace placeholder)

**Interfaces:**
- Consumes: `GET /api/files/tree`, `FileListRow`, `getChildren`, `getBreadcrumb`, `findNode`, `FileNode`

- [ ] **Step 1: Replace `src/app/(app)/files/page.tsx`**

Key requirements:
- `"use client"`
- Read `folder` from `useSearchParams()`
- `fetch("/api/files/tree")` on mount and on retry
- Validate folder id: if `findNode` returns null or not folder → treat as root (`null`)
- Render breadcrumb: `ทั้งหมด` + ancestors; clicking navigates
- `getChildren(nodes, currentFolderId)` — folders render before files (already sorted in helper; split display: folders block then files block)
- Loading skeleton (5 rows)
- Error banner + ลองใหม่
- Empty: "ยังไม่มีเอกสารในโฟลเดอร์นี้"
- `mx-auto max-w-[800px] px-4 py-6`
- Title: เอกสารต่างๆ
- `onOpenFolder`: `router.push(/files?folder=${id})`
- `onOpenFile`: `window.open(url, "_blank", "noopener,noreferrer")`

- [ ] **Step 2: Manual QA on `/files`**

Checklist from spec § Testing / QA items 1–8.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/files/page.tsx
git commit -m "feat(files): build folder browser page"
```

---

### Task 7: Sidebar cleanup

**Files:**
- Modify: `src/components/Sidebar.tsx`

**Interfaces:**
- Removes `/files/upload` child from `NAV_OBSERVE`

- [ ] **Step 1: Edit Sidebar**

In `NAV_OBSERVE`, change เอกสารต่างๆ children to only:

```typescript
children: [{ label: "เอกสารทั้งหมด", href: "/files" }],
```

Remove `{ label: "อัปโหลดใหม่", href: "/files/upload" }`.

- [ ] **Step 2: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "chore(files): remove upload link from sidebar"
```

---

### Task 8: Final verification

**Files:** none new

- [ ] **Step 1: Run unit tests**

```bash
npx vitest run src/lib/fileTree.test.ts
```

Expected: all tests pass

- [ ] **Step 2: Run build (optional — note pre-existing errors OK if unrelated)**

```bash
npm run build
```

- [ ] **Step 3: Document results in SDD progress ledger**

---

## Spec Coverage Checklist

| Spec requirement | Task |
|---|---|
| Google Sheet format + validation | Task 2 |
| Service account fetch | Task 3 |
| Sync on page load | Task 4 + 6 |
| 180s cache | Task 4 |
| List row UI | Task 5 + 6 |
| Breadcrumb + ?folder= | Task 6 |
| Drive opens new tab | Task 6 |
| Remove upload sidebar link | Task 7 |
| Thai errors | Task 3, 4, 6 |
| No Supabase / no user uploads | N/A (not implemented) |

## Type Consistency Check

- `FileNode.parentId` (camelCase) used consistently in API JSON and client
- `driveUrl` nullable for folders, required string for files after parse
- `sortOrder` number everywhere
