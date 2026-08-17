# Board Calendar Node + Appointment Sync Design

**Date:** 2026-08-16  
**Status:** Draft — pending user review

## Problem

On `announces/[id]`, clicking a **calendar (appointment) node** does not open the side panel. Users cannot delete the node or edit linked appointments from the board.

Separately, appointments created from board connections appear on `/appointment`, but deleting them there would orphan or contradict the board — board-sourced appointments should only be removed from the board.

## Goals

1. Calendar node behaves like other nodes: click → side panel opens.
2. Panel supports **view / edit** flow (แก้ไข button) with date + tag editing for linked appointments.
3. Panel supports **delete node** (ลบนัดหมาย) with confirmation.
4. Deleting calendar node or its connections deletes linked appointments from the calendar.
5. `/appointment` page **blocks delete** for board-sourced appointments; user must delete from the board.

## Non-Goals

- Editing calendar node visual (PaperDateCard mini preview stays derived from primary appointment).
- Unlinking an appointment without deleting it (delete connection already deletes appointment).
- Changing how appointments are created when connecting text ↔ calendar.

---

## Root Cause

`AppointmentBlock` uses `sharedHandlers.onSelect` → `selectBlock(id)`, which only toggles expand/collapse and **never calls `openPanel`**. Other nodes (link, dock, text for read-only) call `openPanel` on click.

Additionally, appointment blocks are **excluded** from the panel **แก้ไข** button:

```tsx
!isAppointmentBlock(selectedBlock) && (isPanelEditing ? ... : <Button>แก้ไข</Button>)
```

---

## Approaches Considered

| Approach | Pros | Cons |
|----------|------|------|
| **A. Fix click + minimal panel (view/delete only)** | Smallest diff | User chose B — needs date/tag edit |
| **B. Fix click + inline panel editor (recommended)** | Matches other nodes; reuses `MiniDatePicker`, `TagSelector`, `updateAppointment` | Slightly more UI in board page |
| **C. Open full `AppointmentDetailDialog` from board** | Maximum reuse | Breaks “like other node” panel pattern; heavy modal |

**Recommendation:** B

---

## Architecture

### 1. Open panel on calendar node click

Change appointment block `onSelect` to:

- If drag moved → ignore (existing).
- If `connectingFromId` → `selectBlock` (existing connection flow).
- Else → `openPanel(block.id, canEdit)` (same as link/dock nodes).

Keep expand-on-click optional: opening panel also calls `expandBlock` via `openPanel`.

### 2. Appointment block panel content

**View mode** (default):

- Section: **ข้อความที่เชื่อม** — existing linked text list (unchanged).
- Section: **นัดหมายที่เชื่อม** — for each connection with `appointmentId`, show:
  - Linked text title
  - `appointmentDateLabel(appointment)`
  - Tag pill (connection tone / custom tag)
- Footer actions (existing): **เชื่อมต่อ**, **ลบนัดหมาย** (delete node).

**Edit mode** (`isPanelEditing === true`, via **แก้ไข** button):

- Enable **แก้ไข** for appointment blocks (remove `!isAppointmentBlock` guard).
- Per linked appointment (or primary if single):
  - `MiniDatePicker` for `scheduled_date` (single-day; range not created from board today)
  - `TagSelector` for tone + custom tag (reuse `updateConnectionTag` + appointment update path)
- **เสร็จสิ้น** exits edit mode (existing pattern).

**Save behavior:** On date/tag change in edit mode, call existing `updateAppointment` + update `appointmentCache` and connection tag fields (mirror `updateConnectionTag`).

If multiple connections each have their own `appointmentId`, edit each row independently in the panel list.

### 3. Delete calendar node → delete calendar appointments

**Already implemented** in `deleteBlock` and `disconnectConnection`: iterates removed connections and calls `deleteAppointment(connection.appointmentId)`.

**Hardening:**

- When deleting appointment block, collect **all unique** `appointmentId` values from connections touching that block before removing state.
- Await `deleteAppointment` for each (best-effort; log failures).
- Clear `appointmentCache` entries.

No change needed for “delete connection line” — already deletes appointment.

### 4. Block delete on `/appointment` for board-sourced items

**Detection:** existing `parseBoardSourceFromText(title|description).boardLabel !== null`  
Add helper in `appointments.ts`:

```typescript
export function isBoardSourcedAppointment(record: Pick<AppointmentRecord, "title" | "description">): boolean
```

**`AppointmentDetailDialog`:**

- If `isBoardSourcedAppointment(appointment)`:
  - Hide delete button / danger zone in view and edit tabs.
  - Show info note: `นัดหมายนี้มาจากบอร์ด — ลบได้ที่หน้าบอร์ดประกาศเท่านั้น`
- Manual appointments: delete unchanged.

**`handleDeleteAppointment` on appointment page:** optional server-side guard — return friendly error if board-sourced (defense in depth).

---

## Data Flow

```
Text node ──connection── Calendar node
                │
                └── appointmentId → appointments row
                    title/description contain (มาจากบอร์ด: {board title})
```

| Action | Board | `/appointment` |
|--------|-------|----------------|
| Click calendar node | Open panel | — |
| Edit date/tag in panel | `updateAppointment` + cache | Shows updated data on reload |
| Delete calendar node | `deleteBlock` → delete all linked `appointmentId` | Appointments removed |
| Delete connection | `disconnectConnection` → delete `appointmentId` | Appointment removed |
| Delete appointment | — | **Blocked** if board-sourced |

---

## Files to Change

| File | Change |
|------|--------|
| `src/app/(app)/announces/[id]/page.tsx` | Fix `onSelect` for appointment blocks; enable แก้ไข; add edit fields in appointment panel section |
| `src/lib/appointments.ts` | Add `isBoardSourcedAppointment` helper |
| `src/app/(app)/appointment/AppointmentDetailDialog.tsx` | Hide delete + show message for board-sourced |
| `src/app/(app)/appointment/page.tsx` | Optional guard in `handleDeleteAppointment` |

---

## Error Handling

| Case | Behavior |
|------|----------|
| Panel open, appointment not in cache yet | Show loading skeleton; fetch via existing `fetchAppointmentsByIds` effect |
| `updateAppointment` fails | Inline error in panel (Thai) |
| `deleteAppointment` fails on node delete | Still remove node from board; log error (appointment may orphan — acceptable edge case) |
| User tries delete on `/appointment` for board item | Thai message; no delete |

---

## Testing / QA

| # | Test | Expected |
|---|------|----------|
| 1 | Click calendar node | Side panel opens |
| 2 | Click แก้ไข on calendar node | Date + tag fields editable |
| 3 | Change date, save, check `/appointment` | Date updated |
| 4 | Delete calendar node | Node gone; linked appointments gone from calendar |
| 5 | Delete connection text↔calendar | Appointment gone from calendar |
| 6 | Open board-sourced appointment on `/appointment` | No delete button; info message shown |
| 7 | Manual appointment on `/appointment` | Delete still works |

---

## Spec Self-Review

- No TBD placeholders.
- Consistent with existing board source suffix `(มาจากบอร์ด: …)`.
- Scoped to one implementation plan; no unrelated refactors.
- User chose panel edit (B), not full dialog (C).
