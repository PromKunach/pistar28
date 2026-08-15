import {
  getAppointmentAccentColor,
  PRESET_TAG_OPTIONS,
  TONE_ACCENT,
} from "@/app/(app)/appointment/appointment-ui"
import { getSavedTagKey, type SavedAppointmentTag } from "@/lib/appointmentTags"
import { appointmentTagLabel, type AppointmentRecord } from "@/lib/appointments"

export type AppointmentFilterState = {
  search: string
  tagKeys: string[]
  mineOnly: boolean
}

export const EMPTY_APPOINTMENT_FILTER: AppointmentFilterState = {
  search: "",
  tagKeys: [],
  mineOnly: false,
}

export type AppointmentFilterTagOption = {
  key: string
  label: string
  color: string
}

export function getAppointmentTagKey(item: AppointmentRecord) {
  if (item.tag_label) {
    return `custom:${item.tag_label}:${item.tag_color ?? ""}`
  }
  return `tone:${item.tone}`
}

export function isAppointmentFilterActive(filter: AppointmentFilterState) {
  return (
    filter.search.trim().length > 0 ||
    filter.tagKeys.length > 0 ||
    filter.mineOnly
  )
}

export function appointmentMatchesFilter(
  item: AppointmentRecord,
  filter: AppointmentFilterState,
  userId?: string | null
) {
  if (filter.mineOnly && userId && item.author_pbri_id !== userId) {
    return false
  }

  const query = filter.search.trim().toLowerCase()
  if (query) {
    const inTitle = item.title.toLowerCase().includes(query)
    const inDescription = item.description.toLowerCase().includes(query)
    const inTag = (appointmentTagLabel(item) ?? "").toLowerCase().includes(query)
    if (!inTitle && !inDescription && !inTag) return false
  }

  if (filter.tagKeys.length > 0 && !filter.tagKeys.includes(getAppointmentTagKey(item))) {
    return false
  }

  return true
}

export function buildFilterTagOptions(
  appointments: AppointmentRecord[],
  savedTags: SavedAppointmentTag[] = []
) {
  const map = new Map<string, AppointmentFilterTagOption>()

  for (const preset of PRESET_TAG_OPTIONS) {
    map.set(`tone:${preset.value}`, {
      key: `tone:${preset.value}`,
      label: preset.label,
      color: preset.color,
    })
  }

  map.set("tone:neutral", {
    key: "tone:neutral",
    label: "อื่นๆ",
    color: TONE_ACCENT.neutral,
  })

  for (const tag of savedTags) {
    const key = getSavedTagKey(tag)
    map.set(key, {
      key,
      label: tag.label,
      color: tag.color,
    })
  }

  for (const item of appointments) {
    const key = getAppointmentTagKey(item)
    if (map.has(key)) continue

    map.set(key, {
      key,
      label: appointmentTagLabel(item) ?? "ไม่มีแท็ก",
      color: getAppointmentAccentColor(item),
    })
  }

  return [...map.values()].sort((left, right) =>
    left.label.localeCompare(right.label, "th")
  )
}

export function filterAppointments(
  appointments: AppointmentRecord[],
  filter: AppointmentFilterState,
  userId?: string | null
) {
  if (!isAppointmentFilterActive(filter)) return appointments
  return appointments.filter((item) => appointmentMatchesFilter(item, filter, userId))
}
