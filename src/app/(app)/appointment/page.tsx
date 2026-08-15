"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { AddAppointmentDialog } from "@/app/(app)/appointment/AddAppointmentDialog"
import { AppointmentDetailDialog } from "@/app/(app)/appointment/AppointmentDetailDialog"
import {
  EMPTY_APPOINTMENT_FILTER,
  filterAppointments,
  isAppointmentFilterActive,
  type AppointmentFilterState,
} from "@/app/(app)/appointment/appointment-filter"
import { AppointmentFilterPopover } from "@/app/(app)/appointment/AppointmentFilterPopover"
import {
  buildDateCardTheme,
  colorWithOpacity,
  getAppointmentAccentColor,
  useIsDarkMode,
} from "@/app/(app)/appointment/appointment-ui"
import { Button } from "@/components/ui/button"
import {
  appointmentLoadErrorMessage,
  appointmentSaveErrorMessage,
  createAppointmentsFromDraft,
  deleteAppointment,
  fetchAppointmentsForMonth,
  updateAppointment,
  type AppointmentDraft,
  type AppointmentEditDraft,
  type AppointmentRecord,
} from "@/lib/appointments"
import { useCurrentUser } from "@/lib/userProfile"
import {
  fetchSavedAppointmentTags,
  getSavedTagKey,
  upsertSavedAppointmentTag,
  type SavedAppointmentTag,
} from "@/lib/appointmentTags"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"] as const

const THEME_TRANSITION = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const }

function appointmentAccentStyle(item: AppointmentRecord, opacity = 1) {
  const color = getAppointmentAccentColor(item)
  return { backgroundColor: colorWithOpacity(color, opacity) }
}

const FRAME_TRANSITION = { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const }

function PaperDateCardContent({
  date,
  themed,
  theme,
  isSameMonth,
  monthYearLabel,
  weekdayLabel,
}: {
  date: Date
  themed: boolean
  theme: ReturnType<typeof buildDateCardTheme> | null
  isSameMonth: boolean
  monthYearLabel: string
  weekdayLabel: string
}) {
  if (isSameMonth) {
    return (
      <div className="flex min-h-[14.5rem] flex-col items-center justify-center px-8 py-10 text-center">
        {themed && theme ? (
          <motion.p
            animate={{ color: theme.monthText }}
            transition={THEME_TRANSITION}
            className="text-xl font-medium"
          >
            {monthYearLabel}
          </motion.p>
        ) : (
          <p className="text-xl font-medium text-slate-600 dark:text-neutral-400">
            {monthYearLabel}
          </p>
        )}
        <div className="mt-2 flex h-[5.5rem] items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={date.getDate()}
              initial={{ opacity: 0, y: 16 }}
              animate={{
                opacity: 1,
                y: 0,
                ...(themed && theme ? { color: theme.dayText } : {}),
              }}
              exit={{ opacity: 0, y: -12 }}
              transition={FRAME_TRANSITION}
              className={cn(
                "text-7xl font-semibold tracking-tight",
                !themed && "text-slate-900 dark:text-neutral-100"
              )}
            >
              {date.getDate()}
            </motion.p>
          </AnimatePresence>
        </div>
        {themed && theme ? (
          <motion.p
            animate={{ color: theme.weekdayText }}
            transition={THEME_TRANSITION}
            className="mt-3 text-base"
          >
            {weekdayLabel}
          </motion.p>
        ) : (
          <p className="mt-3 text-base text-slate-500 dark:text-neutral-500">
            {weekdayLabel}
          </p>
        )}
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={dateKey(date)}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={FRAME_TRANSITION}
        className="flex min-h-[14.5rem] flex-col items-center justify-center px-8 py-10 text-center"
      >
        {themed && theme ? (
          <motion.p
            animate={{ color: theme.monthText }}
            transition={THEME_TRANSITION}
            className="text-xl font-medium"
          >
            {monthYearLabel}
          </motion.p>
        ) : (
          <p className="text-xl font-medium text-slate-600 dark:text-neutral-400">
            {monthYearLabel}
          </p>
        )}
        {themed && theme ? (
          <motion.p
            animate={{ color: theme.dayText }}
            transition={THEME_TRANSITION}
            className="mt-2 text-7xl font-semibold tracking-tight"
          >
            {date.getDate()}
          </motion.p>
        ) : (
          <p className="mt-2 text-7xl font-semibold tracking-tight text-slate-900 dark:text-neutral-100">
            {date.getDate()}
          </p>
        )}
        {themed && theme ? (
          <motion.p
            animate={{ color: theme.weekdayText }}
            transition={THEME_TRANSITION}
            className="mt-3 text-base"
          >
            {weekdayLabel}
          </motion.p>
        ) : (
          <p className="mt-3 text-base text-slate-500 dark:text-neutral-500">
            {weekdayLabel}
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function buildYearOptions(anchorYear: number, span = 10) {
  const start = anchorYear - span
  return Array.from({ length: span * 2 + 1 }, (_, index) => start + index)
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

function YearDropdown({
  year,
  years,
  onChange,
}: {
  year: number
  years: number[]
  onChange: (year: number) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [open])

  useEffect(() => {
    if (!open || !listRef.current) return
    const active = listRef.current.querySelector('[data-active="true"]')
    active?.scrollIntoView({ block: "center" })
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`เลือกปี ${year + 543}`}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-8 items-center gap-1 rounded-lg text-sm font-semibold text-slate-900 transition-colors hover:text-slate-600 dark:text-neutral-100 dark:hover:text-neutral-300"
      >
        <span className="tabular-nums">{year + 543}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-slate-500 transition-transform duration-200 dark:text-neutral-400",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 top-[calc(100%+6px)] z-50 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
          >
            <div
              ref={listRef}
              role="listbox"
              aria-label="เลือกปี"
              className="max-h-52 overflow-y-auto p-1 no-scrollbar"
            >
              {years.map((option) => {
                const isActive = option === year
                return (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    data-active={isActive}
                    onClick={() => {
                      onChange(option)
                      setOpen(false)
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm tabular-nums transition-colors",
                      isActive
                        ? "bg-slate-100 font-semibold text-slate-900 dark:bg-neutral-800 dark:text-neutral-100"
                        : "text-slate-600 hover:bg-slate-50 dark:text-neutral-400 dark:hover:bg-neutral-800/70"
                    )}
                  >
                    {option + 543}
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-500 dark:bg-neutral-400" />
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PaperDateCard({
  date,
  accentColor,
}: {
  date: Date
  accentColor?: string | null
}) {
  const isDark = useIsDarkMode()
  const themed = Boolean(accentColor)
  const theme = useMemo(
    () => (accentColor ? buildDateCardTheme(accentColor, isDark) : null),
    [accentColor, isDark]
  )
  const stackLayers = themed
    ? [
        { width: "w-[90%]", backgroundColor: theme!.stack1 },
        { width: "w-[76%]", backgroundColor: theme!.stack2 },
      ]
    : [
        { width: "w-[90%]", className: "bg-slate-100 dark:bg-neutral-900/80" },
        { width: "w-[76%]", className: "bg-slate-50 dark:bg-neutral-950" },
      ]
  const prevDateRef = useRef(date)
  const isSameMonth =
    prevDateRef.current.getFullYear() === date.getFullYear() &&
    prevDateRef.current.getMonth() === date.getMonth()
  const monthYearLabel = date.toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
  })
  const weekdayLabel = date.toLocaleDateString("th-TH", { weekday: "long" })

  useEffect(() => {
    prevDateRef.current = date
  }, [date])

  return (
    <div className="flex w-full flex-col items-center">
      <div className="relative w-full pt-3">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-2 inset-x-0 z-10 h-14"
        >
          {themed ? (
            <>
              <motion.span
                animate={{
                  backgroundColor: theme!.ringBackground,
                  borderColor: theme!.ringBorder,
                }}
                transition={THEME_TRANSITION}
                className="absolute top-0 left-[20%] h-14 w-2.5 -translate-x-1/2 rounded-[5px] border"
              />
              <motion.span
                animate={{
                  backgroundColor: theme!.ringBackground,
                  borderColor: theme!.ringBorder,
                }}
                transition={THEME_TRANSITION}
                className="absolute top-0 left-[80%] h-14 w-2.5 -translate-x-1/2 rounded-[5px] border"
              />
            </>
          ) : (
            <>
              <span className="absolute top-0 left-[20%] h-14 w-2.5 -translate-x-1/2 rounded-[5px] border border-slate-300/80 bg-slate-300 dark:border-neutral-600 dark:bg-neutral-700" />
              <span className="absolute top-0 left-[80%] h-14 w-2.5 -translate-x-1/2 rounded-[5px] border border-slate-300/80 bg-slate-300 dark:border-neutral-600 dark:bg-neutral-700" />
            </>
          )}
        </div>

        {themed && theme ? (
          <motion.div
            animate={{
              backgroundColor: theme.cardBackground,
              borderColor: theme.cardBorder,
            }}
            transition={THEME_TRANSITION}
            className="w-full overflow-hidden rounded-xl border pt-5 shadow-sm"
          >
            <PaperDateCardContent
              date={date}
              themed={themed}
              theme={theme}
              isSameMonth={isSameMonth}
              monthYearLabel={monthYearLabel}
              weekdayLabel={weekdayLabel}
            />
          </motion.div>
        ) : (
          <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white pt-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <PaperDateCardContent
              date={date}
              themed={themed}
              theme={theme}
              isSameMonth={isSameMonth}
              monthYearLabel={monthYearLabel}
              weekdayLabel={weekdayLabel}
            />
          </div>
        )}
      </div>

      {stackLayers.map((layer, index) =>
        themed && "backgroundColor" in layer ? (
          <motion.div
            key={index}
            aria-hidden="true"
            animate={{ backgroundColor: layer.backgroundColor }}
            transition={THEME_TRANSITION}
            className={cn("mt-1 h-2 rounded-b-lg rounded-t-none", layer.width)}
          />
        ) : (
          <div
            key={index}
            aria-hidden="true"
            className={cn(
              "mt-1 h-2 rounded-b-lg rounded-t-none",
              layer.width,
              "className" in layer ? layer.className : undefined
            )}
          />
        )
      )}
    </div>
  )
}

export default function AppointmentPage() {
  const now = new Date()
  const { user } = useCurrentUser()
  const [viewMonth, setViewMonth] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1)
  )
  const [selected, setSelected] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), now.getDate())
  )
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [focusedAppointmentId, setFocusedAppointmentId] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState<"view" | "edit">("view")
  const [filter, setFilter] = useState<AppointmentFilterState>(EMPTY_APPOINTMENT_FILTER)
  const [savedTags, setSavedTags] = useState<SavedAppointmentTag[]>([])

  const yearOptions = useMemo(() => buildYearOptions(now.getFullYear()), [])

  const reloadSavedTags = useCallback(async () => {
    if (!user) {
      setSavedTags([])
      return
    }

    try {
      const tags = await fetchSavedAppointmentTags(user.studentId)
      setSavedTags(tags)
    } catch {
      setSavedTags([])
    }
  }, [user])

  useEffect(() => {
    void reloadSavedTags()
  }, [reloadSavedTags])

  const handlePersistTag = useCallback(
    async (label: string, color: string) => {
      if (!user) return

      const tag = await upsertSavedAppointmentTag(user.studentId, label, color)
      setSavedTags((current) => {
        const key = getSavedTagKey(tag)
        const next = current.filter((item) => getSavedTagKey(item) !== key)
        next.push(tag)
        return next.sort((left, right) => left.label.localeCompare(right.label, "th"))
      })
    },
    [user]
  )

  const reloadAppointments = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const records = await fetchAppointmentsForMonth(
        viewMonth.getFullYear(),
        viewMonth.getMonth()
      )
      setAppointments(records)
    } catch (error) {
      setAppointments([])
      setLoadError(appointmentLoadErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [viewMonth])

  useEffect(() => {
    void reloadAppointments()
  }, [reloadAppointments])

  const handleAddAppointment = useCallback(
    async (draft: AppointmentDraft) => {
      if (!user) {
        throw new Error("กรุณาเข้าสู่ระบบก่อนเพิ่มนัดหมาย")
      }

      try {
        await createAppointmentsFromDraft(draft, user.studentId)
        await reloadAppointments()
      } catch (error) {
        throw new Error(appointmentSaveErrorMessage(error))
      }
    },
    [user, reloadAppointments]
  )

  const filteredAppointments = useMemo(
    () => filterAppointments(appointments, filter, user?.studentId),
    [appointments, filter, user?.studentId]
  )

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, AppointmentRecord[]>()
    for (const item of filteredAppointments) {
      const key = item.scheduled_date.slice(0, 10)
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return map
  }, [filteredAppointments])

  const filterIsActive = isAppointmentFilterActive(filter)

  const selectedKey = dateKey(selected)
  const selectedAppointments = appointmentsByDate.get(selectedKey) ?? []
  const selectedDayAccent =
    selectedAppointments.length > 0 ? getAppointmentAccentColor(selectedAppointments[0]) : null
  const focusedAppointment =
    selectedAppointments.find((item) => item.id === focusedAppointmentId) ?? null
  const monthCells = buildMonthCells(viewMonth.getFullYear(), viewMonth.getMonth())
  const monthLabel = viewMonth.toLocaleDateString("th-TH", { month: "long" })
  const monthFrameKey = `${viewMonth.getFullYear()}-${viewMonth.getMonth()}`
  const selectedInViewMonth =
    selected.getFullYear() === viewMonth.getFullYear() &&
    selected.getMonth() === viewMonth.getMonth()
  const gridRef = useRef<HTMLDivElement>(null)
  const cellRefs = useRef(new Map<string, HTMLButtonElement>())
  const [selectionFrame, setSelectionFrame] = useState<{
    x: number
    y: number
    width: number
    height: number
    visible: boolean
  }>({ x: 0, y: 0, width: 0, height: 0, visible: false })

  useLayoutEffect(() => {
    if (!selectedInViewMonth || !gridRef.current) {
      setSelectionFrame((current) =>
        current.visible ? { ...current, visible: false } : current
      )
      return
    }

    const cell = cellRefs.current.get(selectedKey)
    const grid = gridRef.current
    if (!cell) {
      setSelectionFrame((current) =>
        current.visible ? { ...current, visible: false } : current
      )
      return
    }

    const gridRect = grid.getBoundingClientRect()
    const cellRect = cell.getBoundingClientRect()
    const next = {
      x: cellRect.left - gridRect.left,
      y: cellRect.top - gridRect.top,
      width: cellRect.width,
      height: cellRect.height,
      visible: true,
    }

    setSelectionFrame((current) => {
      if (
        current.visible === next.visible &&
        current.x === next.x &&
        current.y === next.y &&
        current.width === next.width &&
        current.height === next.height
      ) {
        return current
      }
      return next
    })
  }, [selectedKey, selectedInViewMonth, monthFrameKey, isLoading])

  useEffect(() => {
    setIsDetailOpen(false)
    setFocusedAppointmentId(null)
    setDetailTab("view")
  }, [selectedKey])

  const openAppointmentDetail = (id: string, tab: "view" | "edit" = "view") => {
    setFocusedAppointmentId(id)
    setDetailTab(tab)
    setIsDetailOpen(true)
  }

  const closeAppointmentDetail = () => {
    setIsDetailOpen(false)
    setFocusedAppointmentId(null)
    setDetailTab("view")
  }

  const handleUpdateAppointment = useCallback(
    async (id: string, draft: AppointmentEditDraft) => {
      if (!user) {
        throw new Error("กรุณาเข้าสู่ระบบก่อนแก้ไขนัดหมาย")
      }

      try {
        await updateAppointment(id, draft, user.studentId)
        await reloadAppointments()
      } catch (error) {
        throw new Error(appointmentSaveErrorMessage(error))
      }
    },
    [user, reloadAppointments]
  )

  const handleDeleteAppointment = useCallback(
    async (id: string) => {
      if (!user) {
        throw new Error("กรุณาเข้าสู่ระบบก่อนลบนัดหมาย")
      }

      try {
        await deleteAppointment(id)
        await reloadAppointments()
      } catch (error) {
        throw new Error(appointmentSaveErrorMessage(error))
      }
    },
    [user, reloadAppointments]
  )

  const shiftMonth = (delta: number) => {
    setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  }

  const setViewYear = (year: number) => {
    setViewMonth((current) => new Date(year, current.getMonth(), 1))
    setSelected((current) => {
      const maxDay = daysInMonth(year, current.getMonth())
      return new Date(year, current.getMonth(), Math.min(current.getDate(), maxDay))
    })
  }

  const selectDay = (day: number) => {
    setSelected(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day))
  }

  return (
    <div className="container space-y-4 px-[20px] pb-[20px] pt-2 no-scrollbar">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200">
          กำหนดการณ์
        </h1>
      </div>

      {loadError && (
        <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <section className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
          <PaperDateCard date={selected} accentColor={selectedDayAccent} />

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-neutral-500">
                รายการในวันนี้
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAddOpen(true)}
                className="text-slate-600 dark:text-neutral-400"
              >
                <Plus className="h-4 w-4" />
                
              </Button>
            </div>

            <ul className="space-y-2">
              {isLoading ? (
                <li className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-neutral-800 dark:text-neutral-500">
                  กำลังโหลด...
                </li>
              ) : selectedAppointments.length > 0 ? (
                selectedAppointments.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => openAppointmentDetail(item.id)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-left transition-colors hover:border-slate-300 hover:bg-white dark:border-neutral-800 dark:bg-neutral-950/40 dark:hover:border-neutral-700"
                    >
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={appointmentAccentStyle(item)}
                      />
                      <div className="min-w-0 flex-1">
                        <div
                          className="mb-2 h-1.5 w-full rounded-full"
                          style={appointmentAccentStyle(item, 0.8)}
                        />
                        {item.tag_label ? (
                          <span
                            className="mb-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-neutral-400"
                            style={{ borderColor: item.tag_color ?? undefined }}
                          >
                            {item.tag_label}
                          </span>
                        ) : null}
                        <p className="text-sm font-medium text-slate-900 dark:text-neutral-100">
                          {item.title}
                        </p>
                        {item.description ? (
                          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-neutral-400">
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    </button>
                  </li>
                ))
              ) : (
                <li className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-neutral-800 dark:text-neutral-500">
                  {filterIsActive
                    ? "ไม่มีนัดหมายที่ตรงกับตัวกรอง"
                    : "ไม่มีนัดหมายในวันนี้"}
                </li>
              )}
            </ul>
          </div>
        </section>

        <section className="min-w-0 flex-1">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
                  {monthLabel}
                </h2>
                <YearDropdown
                  year={viewMonth.getFullYear()}
                  years={yearOptions}
                  onChange={setViewYear}
                />
              </div>
              <div className="flex items-center gap-1">
                <AppointmentFilterPopover
                  filter={filter}
                  onChange={setFilter}
                  appointments={appointments}
                  savedTags={savedTags}
                  canFilterMine={Boolean(user)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="เดือนก่อนหน้า"
                  onClick={() => shiftMonth(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="เดือนถัดไป"
                  onClick={() => shiftMonth(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div ref={gridRef} className="relative isolate grid grid-cols-7 gap-1 sm:gap-1.5">
              {WEEKDAYS.map((label) => (
                <div
                  key={label}
                  className="py-2 text-center text-xs font-medium text-slate-500 dark:text-neutral-500"
                >
                  {label}
                </div>
              ))}

              {monthCells.map((cell, index) => {
                if (!cell.day || !cell.dateKey) {
                  return <div key={`empty-${index}`} className="min-h-16 sm:min-h-20" />
                }

                const dayAppointments = appointmentsByDate.get(cell.dateKey) ?? []
                const isSelected = selectedInViewMonth && cell.dateKey === selectedKey
                const isToday = cell.dateKey === dateKey(now)

                const cellKey = cell.dateKey

                return (
                  <button
                    key={cellKey}
                    ref={(element) => {
                      if (element) cellRefs.current.set(cellKey, element)
                      else cellRefs.current.delete(cellKey)
                    }}
                    type="button"
                    onClick={() => selectDay(cell.day!)}
                    className={cn(
                      "relative z-0 flex min-h-16 flex-col rounded-lg border p-2 text-left sm:min-h-20",
                      isSelected
                        ? "z-[101] border-transparent bg-transparent"
                        : "border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/70"
                    )}
                  >

                    <span
                      className={cn(
                        "relative z-10 inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium",
                        isToday &&
                          !isSelected &&
                          "bg-slate-900 text-white dark:bg-neutral-100 dark:text-neutral-900",
                        isSelected && "text-slate-900 dark:text-neutral-100",
                        !isToday && !isSelected && "text-slate-700 dark:text-neutral-300"
                      )}
                    >
                      {cell.day}
                    </span>
                    <div className="relative z-10 mt-auto flex w-full flex-col gap-1 pt-2">
                      {!isLoading &&
                        dayAppointments.slice(0, 3).map((item) => (
                          <span
                            key={item.id}
                            className="h-1 w-full rounded-full"
                            style={appointmentAccentStyle(item, 0.8)}
                          />
                        ))}
                    </div>
                  </button>
                )
              })}
              {selectionFrame.visible && (
                <motion.div
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 left-0 z-[100] rounded-lg border border-slate-400 bg-slate-50 shadow-md ring-1 ring-slate-400 dark:border-neutral-500 dark:bg-neutral-800 dark:ring-neutral-500"
                  initial={false}
                  animate={{
                    x: selectionFrame.x,
                    y: selectionFrame.y,
                    width: selectionFrame.width,
                    height: selectionFrame.height,
                  }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
            </div>
          </div>
        </section>
      </div>

      <AddAppointmentDialog
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        defaultDate={selected}
        savedTags={savedTags}
        onPersistTag={handlePersistTag}
        onSubmit={handleAddAppointment}
      />

      <AppointmentDetailDialog
        open={isDetailOpen}
        appointment={focusedAppointment}
        savedTags={savedTags}
        onPersistTag={handlePersistTag}
        initialTab={detailTab}
        onClose={closeAppointmentDetail}
        onSave={(draft) => handleUpdateAppointment(focusedAppointment!.id, draft)}
        onDelete={() => handleDeleteAppointment(focusedAppointment!.id)}
      />
    </div>
  )
}
