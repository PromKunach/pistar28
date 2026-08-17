# Files Page (Google Sheet + Drive) Design Spec

**Date:** 2026-08-16  
**Status:** Approved  
**Route:** `/files`

## Summary

Replace the `/files` placeholder with a read-only document browser. Committee manages content in a **Google Sheet** (folder tree + Drive URLs); the app fetches the Sheet on every page load via **Google Sheets API + service account** and renders a file-manager-style list UI. No user-generated content or uploads in the app.

## Requirements

| Requirement | Detail |
|---|---|
| Content source | Single Google Sheet tab (`files`) — admin/committee edits only |
| File storage | Google Drive URLs in Sheet rows (not Supabase Storage) |
| Sync | Fetch Sheet on every `/files` request (server-side); optional **3-minute** in-memory cache |
| Layout | Full-width **list rows** (icon + name + chevron/link) |
| Navigation | Click folder → drill in; breadcrumb trail; URL `?folder={id}` |
| Files | Click → open Drive URL in new tab |
| Auth | Sheet private; shared with service account email |
| User uploads | **None** — remove sidebar "อัปโหลดใหม่" |
| UI language | Thai labels and errors |
| Dark mode | Match existing app styling |

## Non-Goals (v1)

- User upload UI
- In-app editing of folders/files
- Supabase tables for file index
- Search across documents
- Published/public CSV fallback
- Auto cron sync
- Admin sync button

---

## Google Sheet Format

**Tab name:** `files` (configurable via `FILES_SHEET_TAB` env, default `files`)

**Header row (row 1):**

| id | parent_id | name | type | drive_url | sort_order |
|----|-----------|------|------|-----------|------------|

**Column rules:**

| Column | Required | Notes |
|--------|----------|-------|
| `id` | yes | Unique string, e.g. `f-meeting`, `doc-report-01` |
| `parent_id` | no | Empty = root level; must reference existing folder `id` |
| `name` | yes | Display name (Thai OK) |
| `type` | yes | `folder` or `file` only |
| `drive_url` | files only | Valid Google Drive/Docs/Sheets share URL |
| `sort_order` | no | Integer; default `0`; lower sorts first |

**Validation (server-side on parse):**

- Skip rows with missing `id`, `name`, or invalid `type`
- `type=folder` → ignore `drive_url`
- `type=file` → require non-empty `drive_url`
- Orphan `parent_id` (parent not found) → skip row + log warning
- Circular parent chains → skip affected rows + log warning
- Duplicate `id` → keep first row, skip duplicates + log warning

**Example rows:**

```
id          parent_id   name              type    drive_url                              sort_order
f-root                  เอกสารประชุม       folder                                         1
f-2568      f-root      ปี 2568           folder                                         1
doc-jan     f-2568      รายงาน ม.ค.       file    https://drive.google.com/file/d/.../view  1
doc-feb     f-2568      รายงาน ก.พ.       file    https://drive.google.com/file/d/.../view  2
```

---

## Approaches Considered

| Approach | Pros | Cons |
|----------|------|------|
| **A. Sheets API + service account** *(chosen)* | Private sheet; no DB; committee-friendly | Google Cloud one-time setup |
| B. Published CSV | No GCP | Sheet must be public |
| C. Sync to Supabase on load | DB queries | Unnecessary complexity for v1 |

---

## Architecture

```
Google Sheet (admin edits in Sheets UI)
        │
        ▼  each GET /api/files/tree (or server fetch on page load)
Next.js Route Handler
  - authenticate with service account
  - read range files!A:F
  - parse rows → FileNode[]
  - build tree + validate
  - optional 3-min memory cache (key: sheetId+tab)
        │
        ▼
/files page (client)
  - ?folder={id} selects current folder
  - folders first, then files (by sort_order)
  - breadcrumb from ancestor chain
```

### Environment variables (server-only)

| Variable | Description |
|----------|-------------|
| `GOOGLE_SHEETS_ID` | Spreadsheet ID from URL |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Full service account JSON (single line or base64) |
| `FILES_SHEET_TAB` | Tab name, default `files` |
| `FILES_CACHE_TTL_SECONDS` | Optional, default `180` (3 min) |

### Google Cloud setup (one-time, documented in plan)

1. Create GCP project (or use existing)
2. Enable Google Sheets API
3. Create service account + download JSON key
4. Share the Google Sheet with service account email (Viewer)
5. Add env vars to `.env.local` / deployment

---

## Data Types

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
```

---

## API

### `GET /api/files/tree`

**Response:**
```json
{
  "nodes": [ { "id": "...", "parentId": null, "name": "...", "type": "folder", "driveUrl": null, "sortOrder": 1 } ],
  "fetchedAt": "2026-08-16T10:00:00.000Z"
}
```

**Errors:**
- `500` — missing env, Google API failure, parse failure
- Thai error message in JSON: `{ "error": "โหลดเอกสารไม่สำเร็จ" }`

**Cache:** In-route memory cache keyed by `GOOGLE_SHEETS_ID` + tab; TTL `FILES_CACHE_TTL_SECONDS`.

---

## Page UX (`/files`)

### Layout

- Max-width ~800px centered (or full content area width with padding)
- Page title: **เอกสารต่างๆ**
- Breadcrumb: `ทั้งหมด › {folder} › {subfolder}` — each segment clickable

### List rows

**Folders** (rendered first):
- Folder icon (lucide `Folder`)
- Name
- Chevron right
- Click → `router.push(/files?folder={id})`

**Files** (rendered after folders):
- File icon (lucide `FileText`)
- Name
- External link icon
- Click → `window.open(driveUrl, "_blank", "noopener,noreferrer")`

**Row style:** full-width, `rounded-xl`, border, hover background — consistent with news feed cards.

### States

| State | UI |
|-------|-----|
| Loading | 5–6 skeleton rows |
| Empty folder | "ยังไม่มีเอกสารในโฟลเดอร์นี้" |
| Error | Red banner + ลองใหม่ button (refetch) |
| Invalid `?folder=` | Show root + ignore bad id |

### Sidebar change

Remove child link **อัปโหลดใหม่** (`/files/upload`) from `Sidebar.tsx` — only **เอกสารทั้งหมด** remains under เอกสารต่างๆ.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/fileTree.ts` | Parse rows, validate, build tree, get children/breadcrumbs |
| `src/lib/fileTree.test.ts` | Unit tests for parse + tree logic |
| `src/lib/googleSheets.ts` | Service account auth + fetch range |
| `src/app/api/files/tree/route.ts` | API route with cache |
| `src/app/(app)/files/page.tsx` | Folder browser UI |
| `src/app/(app)/files/FileListRow.tsx` | Single row component |
| `src/components/Sidebar.tsx` | Remove upload sub-link |

---

## Error Handling

| Case | Behavior |
|------|----------|
| Missing env vars | API 500; page shows setup error (dev-friendly message) |
| Google API 403 | Log; show "ตรวจสอบการแชร์ Sheet กับ service account" |
| Google API timeout | Retry once; then error UI |
| Empty sheet | Root shows empty state |
| Broken `parent_id` | Skip invalid rows; still render valid subtree |
| Invalid Drive URL on file row | Skip row (or show disabled row — **skip in v1**) |

---

## Security

- Service account JSON **never** exposed to client
- Sheet fetch **only** in Route Handler / server code
- Drive URLs opened with `noopener,noreferrer`
- No write access to Sheet from app
- Sheet shared Viewer-only with service account

---

## Testing / QA

| # | Test | Expected |
|---|------|----------|
| 1 | Open `/files` | Root folders/files load from Sheet |
| 2 | Click folder | Breadcrumb updates; children shown |
| 3 | Click file | Drive opens in new tab |
| 4 | Refresh page | Data re-fetched (or served from cache < 3 min) |
| 5 | Edit Sheet + refresh after cache TTL | UI reflects changes |
| 6 | Empty folder | Thai empty message |
| 7 | Bad `?folder=xyz` | Falls back to root |
| 8 | Missing env (dev) | Clear error, no crash |

---

## Spec Self-Review

- No TBD placeholders.
- Chosen approach A (Sheets API + service account) consistent throughout.
- Sync-on-refresh with optional 3-min cache — matches user approval.
- List-row UI — matches user choice.
- Scoped to single implementation plan; no unrelated refactors.
- Sidebar upload removal explicitly included.
