"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { AppointmentRecord, AppointmentTone } from "@/lib/appointments"
import type { SavedAppointmentTag } from "@/lib/appointmentTags"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"] as const

export const TONE_ACCENT: Record<AppointmentTone, string> = {
  red: "#d97b7b",
  blue: "#6fa3c4",
  neutral: "#94a3b8",
}

export const PRESET_TAG_OPTIONS: { value: AppointmentTone; label: string; color: string }[] = [
  { value: "red", label: "สำคัญ", color: TONE_ACCENT.red },
  { value: "blue", label: "ทั่วไป", color: TONE_ACCENT.blue },
]

export const OTHER_TAG = { value: "neutral" as const, label: "อื่นๆ", color: TONE_ACCENT.neutral }

export const CUSTOM_TAG_COLORS = [
  "#d97b7b",
  "#d4a05a",
  "#72b572",
  "#5a9fc9",
  "#9575cd",
  "#c9759a",
  "#333333",
  "#6b7280",
  "#4a8fd9",
] as const

export function getAppointmentAccentColor(item: Pick<AppointmentRecord, "tone" | "tag_color">) {
  return item.tag_color ?? TONE_ACCENT[item.tone]
}

function parseHex(hex: string) {
  const value = hex.replace("#", "")
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  }
}

function mixHex(color: string, base: string, weight: number) {
  const source = parseHex(color)
  const target = parseHex(base)
  const mix = (left: number, right: number) => Math.round(left * (1 - weight) + right * weight)

  return `rgb(${mix(source.r, target.r)}, ${mix(source.g, target.g)}, ${mix(source.b, target.b)})`
}

export type DateCardTheme = {
  cardBackground: string
  cardBorder: string
  ringBackground: string
  ringBorder: string
  stack1: string
  stack2: string
  monthText: string
  dayText: string
  weekdayText: string
}

export function colorWithOpacity(hex: string, opacity: number) {
  const { r, g, b } = parseHex(hex)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

export function buildDateCardTheme(accent: string, isDark: boolean): DateCardTheme {
  const cardBase = isDark ? "#171717" : "#ffffff"
  const borderBase = isDark ? "#262626" : "#e2e8f0"
  const ringBase = isDark ? "#404040" : "#cbd5e1"
  const ringBorderBase = isDark ? "#525252" : "#94a3b8"
  const stack1Base = isDark ? "#0a0a0a" : "#f8fafc"
  const stack2Base = isDark ? "#050505" : "#f1f5f9"
  const monthTextBase = isDark ? "#d4d4d4" : "#475569"
  const dayTextBase = isDark ? "#fafafa" : "#0f172a"
  const weekdayTextBase = isDark ? "#a3a3a3" : "#64748b"

  return {
    cardBackground: mixHex(accent, cardBase, isDark ? 0.82 : 0.9),
    cardBorder: mixHex(accent, borderBase, isDark ? 0.68 : 0.58),
    ringBackground: mixHex(accent, ringBase, isDark ? 0.52 : 0.48),
    ringBorder: mixHex(accent, ringBorderBase, isDark ? 0.48 : 0.42),
    stack1: mixHex(accent, stack1Base, isDark ? 0.72 : 0.82),
    stack2: mixHex(accent, stack2Base, isDark ? 0.66 : 0.74),
    monthText: mixHex(accent, monthTextBase, isDark ? 0.34 : 0.38),
    dayText: mixHex(accent, dayTextBase, isDark ? 0.18 : 0.12),
    weekdayText: mixHex(accent, weekdayTextBase, isDark ? 0.38 : 0.42),
  }
}

export function useIsDarkMode() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const update = () => setIsDark(root.classList.contains("dark"))
    update()

    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })

    return () => observer.disconnect()
  }, [])

  return isDark
}

export const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus-visible:border-neutral-600 dark:focus-visible:ring-neutral-800"

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function buildMonthCells(year: number, month: number) {
  const first = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0).getDate()
  const leading = first.getDay()
  const cells: Array<{ day: number | null; dateKey: string | null }> = []

  for (let i = 0; i < leading; i += 1) {
    cells.push({ day: null, dateKey: null })
  }

  for (let day = 1; day <= lastDay; day += 1) {
    cells.push({ day, dateKey: dateKey(new Date(year, month, day)) })
  }

  return cells
}

function formatThaiDate(date: Date) {
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function MiniDatePicker({
  value,
  onChange,
  label,
}: {
  value: Date
  onChange: (date: Date) => void
  label: string
}) {
  const [viewMonth, setViewMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1))
  const monthCells = buildMonthCells(viewMonth.getFullYear(), viewMonth.getMonth())
  const selectedKey = dateKey(value)
  const monthLabel = viewMonth.toLocaleDateString("th-TH", { month: "long", year: "numeric" })

  useEffect(() => {
    setViewMonth(new Date(value.getFullYear(), value.getMonth(), 1))
  }, [value])

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-neutral-800 dark:bg-neutral-950/40">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500 dark:text-neutral-500">{label}</p>
        <p className="text-xs font-medium text-slate-700 dark:text-neutral-300">{formatThaiDate(value)}</p>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-900 dark:text-neutral-100">{monthLabel}</span>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="เดือนก่อนหน้า"
            onClick={() =>
              setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
            }
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="เดือนถัดไป"
            onClick={() =>
              setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
            }
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="py-1 text-center text-[10px] font-medium text-slate-500 dark:text-neutral-500"
          >
            {weekday}
          </div>
        ))}

        {monthCells.map((cell, index) => {
          if (!cell.day || !cell.dateKey) {
            return <div key={`empty-${index}`} className="h-7" />
          }

          const isSelected = cell.dateKey === selectedKey

          return (
            <button
              key={cell.dateKey}
              type="button"
              onClick={() =>
                onChange(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), cell.day!))
              }
              className={cn(
                "flex h-7 items-center justify-center rounded-md text-xs font-medium transition-colors",
                isSelected
                  ? "bg-slate-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                  : "text-slate-700 hover:bg-white dark:text-neutral-300 dark:hover:bg-neutral-800"
              )}
            >
              {cell.day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PresetTagButton({
  label,
  color,
  active,
  onClick,
}: {
  label: string
  color: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-slate-400 bg-slate-100 text-slate-900 dark:border-neutral-500 dark:bg-neutral-800 dark:text-neutral-100"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-900"
      )}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </button>
  )
}

export function OtherTagPopup({
  customTagLabel,
  customTagColor,
  onAddCustomTag,
  onPersistTag,
}: {
  customTagLabel: string | null
  customTagColor: string | null
  onAddCustomTag: (label: string, color: string) => void
  onPersistTag?: (label: string, color: string) => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [selectedColor, setSelectedColor] = useState<string>(CUSTOM_TAG_COLORS[0])
  const isActive = Boolean(customTagLabel)
  const activeColor = customTagColor ?? CUSTOM_TAG_COLORS[0]

  useEffect(() => {
    if (!open) return
    setInput(customTagLabel ?? "")
    setSelectedColor(customTagColor ?? CUSTOM_TAG_COLORS[0])
  }, [open, customTagLabel, customTagColor])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open])

  const handleAdd = () => {
    const label = input.trim()
    if (!label) return
    void (async () => {
      await onPersistTag?.(label, selectedColor)
      onAddCustomTag(label, selectedColor)
      setOpen(false)
      setInput("")
    })()
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
          isActive
            ? "border-slate-400 bg-slate-100 text-slate-900 dark:border-neutral-500 dark:bg-neutral-800 dark:text-neutral-100"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-900"
        )}
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: isActive ? activeColor : OTHER_TAG.color }}
        />
        <span>{customTagLabel || OTHER_TAG.label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.button
              type="button"
              aria-label="ปิดหน้าต่าง"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="custom-tag-title"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.8 }}
              className="relative z-10 w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3
                    id="custom-tag-title"
                    className="text-sm font-semibold text-slate-900 dark:text-neutral-100"
                  >
                    เพิ่มแท็กกำหนดเอง
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-500">
                    ตั้งชื่อและเลือกสีสำหรับแท็ก
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setOpen(false)}
                  aria-label="ปิด"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-tag-name">ชื่อแท็ก</Label>
                <input
                  id="custom-tag-name"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      handleAdd()
                    }
                  }}
                  placeholder="ชื่อแท็ก"
                  className={fieldClass}
                />
              </div>

              <div className="mt-4 space-y-2">
                <Label>สีแท็ก</Label>
                <div className="grid grid-cols-3 justify-items-center gap-2">
                  {CUSTOM_TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`เลือกสี ${color}`}
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "h-7 w-7 rounded-full border-2 transition-all",
                        selectedColor === color
                          ? "scale-110 border-slate-900 dark:border-neutral-100"
                          : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="button" size="sm" onClick={handleAdd} disabled={!input.trim()}>
                  เพิ่มแท็ก
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

export function TagSelector({
  tone,
  customTagLabel,
  customTagColor,
  savedTags = [],
  onPersistTag,
  onChange,
}: {
  tone: AppointmentTone
  customTagLabel: string | null
  customTagColor: string | null
  savedTags?: SavedAppointmentTag[]
  onPersistTag?: (label: string, color: string) => void | Promise<void>
  onChange: (value: {
    tone: AppointmentTone
    customTagLabel: string | null
    customTagColor: string | null
  }) => void
}) {
  const isPresetTagActive = (value: AppointmentTone) => tone === value && !customTagLabel

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESET_TAG_OPTIONS.map((tag) => (
        <PresetTagButton
          key={tag.value}
          label={tag.label}
          color={tag.color}
          active={isPresetTagActive(tag.value)}
          onClick={() =>
            onChange({
              tone: tag.value,
              customTagLabel: null,
              customTagColor: null,
            })
          }
        />
      ))}
      {savedTags.map((tag) => {
        const active = customTagLabel === tag.label && customTagColor === tag.color
        return (
          <PresetTagButton
            key={tag.id}
            label={tag.label}
            color={tag.color}
            active={active}
            onClick={() =>
              onChange({
                tone: "neutral",
                customTagLabel: tag.label,
                customTagColor: tag.color,
              })
            }
          />
        )
      })}
      <OtherTagPopup
        customTagLabel={customTagLabel}
        customTagColor={customTagColor}
        onPersistTag={onPersistTag}
        onAddCustomTag={(label, color) =>
          onChange({
            tone: "neutral",
            customTagLabel: label,
            customTagColor: color,
          })
        }
      />
    </div>
  )
}
