import { supabase } from "@/lib/supabaseClient"

export type SavedAppointmentTag = {
  id: string
  label: string
  color: string
  author_pbri_id: string
  created_at: string
}

const storageKey = (authorPbriId: string) => `pistar28:appointment-saved-tags:${authorPbriId}`

export function getSavedTagKey(tag: Pick<SavedAppointmentTag, "label" | "color">) {
  return `custom:${tag.label}:${tag.color}`
}

function loadLocalTags(authorPbriId: string): SavedAppointmentTag[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(storageKey(authorPbriId))
    if (!raw) return []
    return JSON.parse(raw) as SavedAppointmentTag[]
  } catch {
    return []
  }
}

function saveLocalTags(authorPbriId: string, tags: SavedAppointmentTag[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(storageKey(authorPbriId), JSON.stringify(tags))
}

function upsertLocalTag(
  authorPbriId: string,
  label: string,
  color: string
): SavedAppointmentTag {
  const trimmedLabel = label.trim()
  const tags = loadLocalTags(authorPbriId)
  const existing = tags.find((item) => item.label === trimmedLabel)

  if (existing) {
    existing.color = color
    saveLocalTags(authorPbriId, tags)
    return existing
  }

  const tag: SavedAppointmentTag = {
    id: crypto.randomUUID(),
    label: trimmedLabel,
    color,
    author_pbri_id: authorPbriId,
    created_at: new Date().toISOString(),
  }

  const next = [...tags, tag].sort((left, right) =>
    left.label.localeCompare(right.label, "th")
  )
  saveLocalTags(authorPbriId, next)
  return tag
}

function mergeSavedTags(
  authorPbriId: string,
  remote: SavedAppointmentTag[],
  local: SavedAppointmentTag[]
) {
  const map = new Map<string, SavedAppointmentTag>()

  for (const tag of [...local, ...remote]) {
    map.set(tag.label, tag)
  }

  const merged = [...map.values()].sort((left, right) =>
    left.label.localeCompare(right.label, "th")
  )
  saveLocalTags(authorPbriId, merged)
  return merged
}

export async function fetchSavedAppointmentTags(
  authorPbriId: string
): Promise<SavedAppointmentTag[]> {
  const local = loadLocalTags(authorPbriId)

  try {
    const { data, error } = await supabase
      .from("appointment_saved_tags")
      .select("*")
      .eq("author_pbri_id", authorPbriId)
      .order("label", { ascending: true })

    if (error) throw error
    return mergeSavedTags(authorPbriId, (data ?? []) as SavedAppointmentTag[], local)
  } catch {
    return local
  }
}

export async function upsertSavedAppointmentTag(
  authorPbriId: string,
  label: string,
  color: string
): Promise<SavedAppointmentTag> {
  const trimmedLabel = label.trim()
  if (!trimmedLabel) {
    throw new Error("ชื่อแท็กต้องไม่ว่าง")
  }

  try {
    const { data, error } = await supabase
      .from("appointment_saved_tags")
      .upsert(
        {
          label: trimmedLabel,
          color,
          author_pbri_id: authorPbriId,
        },
        { onConflict: "author_pbri_id,label" }
      )
      .select("*")
      .single()

    if (error) throw error

    const tag = data as SavedAppointmentTag
    const local = loadLocalTags(authorPbriId).filter((item) => item.label !== tag.label)
    saveLocalTags(authorPbriId, [...local, tag].sort((left, right) =>
      left.label.localeCompare(right.label, "th")
    ))
    return tag
  } catch {
    return upsertLocalTag(authorPbriId, trimmedLabel, color)
  }
}
