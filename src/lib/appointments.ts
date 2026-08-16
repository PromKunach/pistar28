import { supabase } from "@/lib/supabaseClient"

export type AppointmentTone = "red" | "blue" | "neutral"

export type AppointmentRecord = {
  id: string
  title: string
  description: string
  scheduled_date: string
  tone: AppointmentTone
  tag_label: string | null
  tag_color: string | null
  series_id: string | null
  author_pbri_id: string
  created_at: string
}

export type AppointmentEditDraft = {
  title: string
  description: string
  isRange: boolean
  startDate: Date
  endDate: Date
  tone: AppointmentTone
  customTagLabel: string | null
  customTagColor: string | null
}

export type AppointmentDraft = {
  title: string
  description: string
  isRange: boolean
  startDate: Date
  endDate: Date
  tone: AppointmentTone
  customTagLabel: string | null
  customTagColor: string | null
}

export function parseScheduledDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function getSeriesMembers(
  appointment: AppointmentRecord,
  appointments: AppointmentRecord[]
) {
  if (!appointment.series_id) return [appointment]

  return appointments
    .filter((item) => item.series_id === appointment.series_id)
    .sort((left, right) => left.scheduled_date.localeCompare(right.scheduled_date))
}

export function recordToEditDraft(
  record: AppointmentRecord,
  appointments: AppointmentRecord[] = []
) {
  const hasCustomTag = Boolean(record.tag_label)
  const seriesMembers = getSeriesMembers(record, appointments)
  const dates = seriesMembers.map((item) => parseScheduledDate(item.scheduled_date))
  const startDate = dates[0] ?? parseScheduledDate(record.scheduled_date)
  const endDate = dates[dates.length - 1] ?? startDate

  return {
    title: parseBoardSourceFromText(record.title).body,
    description: parseBoardSourceFromText(record.description).body,
    isRange: seriesMembers.length > 1,
    startDate,
    endDate,
    tone: hasCustomTag ? "neutral" : record.tone,
    customTagLabel: record.tag_label,
    customTagColor: record.tag_color,
  } satisfies AppointmentEditDraft
}

export function appointmentDateLabel(
  record: AppointmentRecord,
  appointments: AppointmentRecord[] = []
) {
  const seriesMembers = getSeriesMembers(record, appointments)

  if (seriesMembers.length <= 1) {
    return parseScheduledDate(record.scheduled_date).toLocaleDateString("th-TH", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const start = parseScheduledDate(seriesMembers[0].scheduled_date)
  const end = parseScheduledDate(seriesMembers[seriesMembers.length - 1].scheduled_date)

  const startLabel = start.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  const endLabel = end.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  return `${startLabel} – ${endLabel}`
}

export function appointmentTagLabel(record: AppointmentRecord) {
  if (record.tag_label) return record.tag_label
  if (record.tone === "red") return "สำคัญ"
  if (record.tone === "blue") return "ทั่วไป"
  return null
}

function monthRange(year: number, month: number) {
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`
  const nextYear = month === 11 ? year + 1 : year
  const nextMonth = month === 11 ? 1 : month + 2
  const end = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`
  return { start, end }
}

function toScheduledDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function eachDateInRange(start: Date, end: Date) {
  const dates: Date[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate())

  while (cursor <= last) {
    dates.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates
}

function buildAppointmentPayload(draft: {
  title: string
  description: string
  tone: AppointmentTone
  customTagLabel: string | null
  customTagColor: string | null
}) {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    tone: draft.tone,
    tag_label: draft.customTagLabel,
    tag_color: draft.customTagLabel ? draft.customTagColor : null,
  }
}

const BOARD_SOURCE_PATTERN = /\s*\(มาจากบอร์ด:\s*(.+?)\)\s*$/

export function parseBoardSourceFromText(text: string) {
  const match = text.match(BOARD_SOURCE_PATTERN)
  if (!match) return { body: text, boardLabel: null }

  const body = text.slice(0, match.index ?? 0).trimEnd()
  return { body, boardLabel: match[1].trim() }
}

export function appendBoardSourceToText(text: string, boardLabel: string) {
  const { body } = parseBoardSourceFromText(text)
  const label = boardLabel.trim() || "บอร์ด"
  const suffix = `(มาจากบอร์ด: ${label})`
  const trimmed = body.trim()
  if (!trimmed) return suffix
  return `${trimmed} ${suffix}`
}

/** @deprecated use parseBoardSourceFromText */
export const parseBoardSourceFromDescription = parseBoardSourceFromText

/** @deprecated use appendBoardSourceToText */
export const appendBoardSourceToDescription = appendBoardSourceToText

export function appointmentDescriptionDisplay(description: string) {
  const trimmed = description.trim()
  return trimmed || null
}

function boardSourceLabelFromRecord(record: Pick<AppointmentRecord, "title" | "description">) {
  return (
    parseBoardSourceFromText(record.title).boardLabel ??
    parseBoardSourceFromText(record.description).boardLabel
  )
}

export async function fetchAppointmentById(id: string) {
  const { data, error } = await supabase.from("appointments").select("*").eq("id", id).single()
  if (error) throw error
  return data as AppointmentRecord
}

export async function fetchAppointmentsByIds(ids: string[]): Promise<AppointmentRecord[]> {
  if (ids.length === 0) return []

  const { data, error } = await supabase.from("appointments").select("*").in("id", ids)
  if (error) throw error
  return (data ?? []) as AppointmentRecord[]
}

async function fetchSeriesMembersFromDb(record: AppointmentRecord) {
  if (!record.series_id) return [record]

  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("series_id", record.series_id)
    .order("scheduled_date", { ascending: true })

  if (error) throw error
  return (data ?? [record]) as AppointmentRecord[]
}

async function findOrphanSiblingIds(record: AppointmentRecord) {
  if (record.series_id) return []

  const { data, error } = await supabase
    .from("appointments")
    .select("id, scheduled_date")
    .eq("author_pbri_id", record.author_pbri_id)
    .eq("title", record.title)
    .eq("description", record.description)
    .is("series_id", null)
    .order("scheduled_date", { ascending: true })

  if (error) throw error
  if (!data?.length) return []

  type Row = { id: string; scheduled_date: string }
  const chains: Row[][] = []
  let chain: Row[] = []

  for (const row of data) {
    if (chain.length === 0) {
      chain = [row]
      continue
    }

    const previous = parseScheduledDate(chain[chain.length - 1].scheduled_date)
    const current = parseScheduledDate(row.scheduled_date)
    const dayDiff = Math.round((current.getTime() - previous.getTime()) / 86_400_000)

    if (dayDiff === 0 || dayDiff === 1) {
      chain.push(row)
    } else {
      chains.push(chain)
      chain = [row]
    }
  }

  chains.push(chain)

  const targetDate = record.scheduled_date.slice(0, 10)
  const matchingChain = chains.find((group) =>
    group.some(
      (item) => item.id === record.id || item.scheduled_date.slice(0, 10) === targetDate
    )
  )

  if (!matchingChain || matchingChain.length <= 1) {
    const sameDateIds = (data as Row[])
      .filter((item) => item.scheduled_date.slice(0, 10) === targetDate)
      .map((item) => item.id)

    return sameDateIds.length > 1 ? sameDateIds.filter((itemId) => itemId !== record.id) : []
  }

  const chainDates = new Set(matchingChain.map((item) => item.scheduled_date.slice(0, 10)))

  return (data as Row[])
    .filter((item) => chainDates.has(item.scheduled_date.slice(0, 10)))
    .map((item) => item.id)
    .filter((itemId) => itemId !== record.id)
}

export function appointmentLoadErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: string }).message)
    if (message.includes("appointments") && message.includes("does not exist")) {
      return "ไม่พบตาราง appointments กรุณารัน supabase/appointments.sql ก่อน"
    }
    if (message.includes("row-level security") || message.includes("permission denied")) {
      return "โหลดกำหนดการณ์ไม่ได้ กรุณารันนโยบายใน supabase/appointments.sql ที่อัปเดตแล้ว"
    }
    return message
  }
  return "โหลดกำหนดการณ์ไม่ได้ กรุณาลองใหม่อีกครั้ง"
}

export function appointmentSaveErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return appointmentLoadErrorMessage(error)
}

export async function fetchAppointmentsForMonth(
  year: number,
  month: number
): Promise<AppointmentRecord[]> {
  const { start, end } = monthRange(year, month)

  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .gte("scheduled_date", start)
    .lt("scheduled_date", end)
    .order("scheduled_date", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) throw error
  return (data ?? []) as AppointmentRecord[]
}

export async function createAppointmentsFromDraft(
  draft: AppointmentDraft,
  authorPbriId: string
): Promise<AppointmentRecord[]> {
  const dates = draft.isRange
    ? eachDateInRange(draft.startDate, draft.endDate)
    : [draft.startDate]

  const seriesId = draft.isRange && dates.length > 1 ? crypto.randomUUID() : null

  const rows = dates.map((date) => ({
    ...buildAppointmentPayload(draft),
    scheduled_date: toScheduledDate(date),
    series_id: seriesId,
    author_pbri_id: authorPbriId,
  }))

  const { data, error } = await supabase.from("appointments").insert(rows).select("*")
  if (error) throw error
  return (data ?? []) as AppointmentRecord[]
}

export async function updateAppointment(
  id: string,
  draft: AppointmentEditDraft,
  authorPbriId: string
): Promise<AppointmentRecord[]> {
  const current = await fetchAppointmentById(id)
  const seriesMembers = await fetchSeriesMembersFromDb(current)
  const boardSourceLabel = boardSourceLabelFromRecord(current)
  const payload = buildAppointmentPayload(draft)
  if (boardSourceLabel) {
    payload.title = appendBoardSourceToText(draft.title, boardSourceLabel)
    payload.description = appendBoardSourceToText(draft.description, boardSourceLabel)
  }

  if (!draft.isRange) {
    const targetDate = toScheduledDate(draft.startDate)
    const removeIds = new Set(
      seriesMembers.filter((member) => member.id !== id).map((member) => member.id)
    )

    for (const orphanId of await findOrphanSiblingIds(current)) {
      removeIds.add(orphanId)
    }

    if (removeIds.size > 0) {
      const { error: deleteError } = await supabase
        .from("appointments")
        .delete()
        .in("id", [...removeIds])
      if (deleteError) throw deleteError
    }

    const { data, error } = await supabase
      .from("appointments")
      .update({
        ...payload,
        scheduled_date: targetDate,
        series_id: null,
      })
      .eq("id", id)
      .select("*")
      .single()

    if (error) throw error
    return [data as AppointmentRecord]
  }

  const targetDates = eachDateInRange(draft.startDate, draft.endDate).map(toScheduledDate)
  const seriesId = current.series_id ?? crypto.randomUUID()

  const { data: rowsOnTargetDates, error: fetchError } = await supabase
    .from("appointments")
    .select("*")
    .eq("author_pbri_id", current.author_pbri_id)
    .in("scheduled_date", targetDates)

  if (fetchError) throw fetchError

  const existingByDate = new Map<string, AppointmentRecord>()

  for (const member of seriesMembers) {
    const dateKey = member.scheduled_date.slice(0, 10)
    if (targetDates.includes(dateKey)) {
      existingByDate.set(dateKey, member)
    }
  }

  for (const row of (rowsOnTargetDates ?? []) as AppointmentRecord[]) {
    const dateKey = row.scheduled_date.slice(0, 10)
    if (existingByDate.has(dateKey)) continue
    if (row.title === current.title && row.description === current.description) {
      existingByDate.set(dateKey, row)
    }
  }

  const keptIds = new Set([...existingByDate.values()].map((row) => row.id))
  const removeIds = new Set<string>()

  for (const member of seriesMembers) {
    const dateKey = member.scheduled_date.slice(0, 10)
    if (!targetDates.includes(dateKey)) {
      removeIds.add(member.id)
    }
  }

  for (const row of (rowsOnTargetDates ?? []) as AppointmentRecord[]) {
    if (keptIds.has(row.id)) continue

    const dateKey = row.scheduled_date.slice(0, 10)
    if (
      targetDates.includes(dateKey) &&
      row.title === current.title &&
      row.description === current.description
    ) {
      removeIds.add(row.id)
    }
  }

  if (removeIds.size > 0) {
    const { error: deleteError } = await supabase
      .from("appointments")
      .delete()
      .in("id", [...removeIds])
    if (deleteError) throw deleteError
  }

  const results: AppointmentRecord[] = []

  for (const dateStr of targetDates) {
    const existing = existingByDate.get(dateStr)

    if (existing) {
      const { data, error } = await supabase
        .from("appointments")
        .update({
          ...payload,
          scheduled_date: dateStr,
          series_id: seriesId,
        })
        .eq("id", existing.id)
        .select("*")
        .single()

      if (error) throw error
      results.push(data as AppointmentRecord)
      continue
    }

    const { data, error } = await supabase
      .from("appointments")
      .insert({
        ...payload,
        scheduled_date: dateStr,
        series_id: seriesId,
        author_pbri_id: authorPbriId,
      })
      .select("*")
      .single()

    if (error) throw error
    results.push(data as AppointmentRecord)
  }

  return results
}

export async function fetchSeriesMembersForRecord(record: AppointmentRecord) {
  return fetchSeriesMembersFromDb(record)
}

export async function deleteAppointment(id: string) {
  const current = await fetchAppointmentById(id)

  if (current.series_id) {
    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("series_id", current.series_id)
    if (error) throw error
    return
  }

  const orphanSiblingIds = await findOrphanSiblingIds(current)
  const idsToDelete = [id, ...orphanSiblingIds]

  const { error } = await supabase.from("appointments").delete().in("id", idsToDelete)
  if (error) throw error
}
