"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Filter, Search, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import {
  EMPTY_APPOINTMENT_FILTER,
  buildFilterTagOptions,
  isAppointmentFilterActive,
  type AppointmentFilterState,
} from "@/app/(app)/appointment/appointment-filter"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { SavedAppointmentTag } from "@/lib/appointmentTags"
import type { AppointmentRecord } from "@/lib/appointments"
import { cn } from "@/lib/utils"

export function AppointmentFilterPopover({
  filter,
  onChange,
  appointments,
  savedTags,
  canFilterMine,
}: {
  filter: AppointmentFilterState
  onChange: (filter: AppointmentFilterState) => void
  appointments: AppointmentRecord[]
  savedTags: SavedAppointmentTag[]
  canFilterMine: boolean
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const tagOptions = useMemo(
    () => buildFilterTagOptions(appointments, savedTags),
    [appointments, savedTags]
  )
  const isActive = isAppointmentFilterActive(filter)

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

  const toggleTag = (key: string) => {
    onChange({
      ...filter,
      tagKeys: filter.tagKeys.includes(key)
        ? filter.tagKeys.filter((item) => item !== key)
        : [...filter.tagKeys, key],
    })
  }

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="กรองนัดหมาย"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "relative",
          isActive && "bg-slate-100 text-slate-900 dark:bg-neutral-800 dark:text-neutral-100"
        )}
      >
        <Filter className="h-4 w-4" />
        {isActive ? (
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-slate-900 dark:bg-neutral-100" />
        ) : null}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="กรองนัดหมาย"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[calc(100%+6px)] z-50 w-[min(100vw-2rem,20rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-neutral-800">
              <p className="text-sm font-semibold text-slate-900 dark:text-neutral-100">กรอง</p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="ปิด"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 p-4 no-scrollbar">
              <div className="space-y-2">
                <Label htmlFor="appointment-filter-search">ค้นหา</Label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950/40">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    id="appointment-filter-search"
                    value={filter.search}
                    onChange={(event) =>
                      onChange({ ...filter, search: event.target.value })
                    }
                    placeholder="ชื่อ / คำอธิบาย / แท็ก"
                    className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-neutral-100 dark:placeholder:text-neutral-500"
                  />
                </div>
              </div>

              {canFilterMine ? (
                <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950/40">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-neutral-100">
                      เฉพาะของฉัน
                    </p>
                    <p className="text-xs text-slate-500 dark:text-neutral-500">
                      แสดงเฉพาะนัดหมายที่คุณสร้าง
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={filter.mineOnly}
                    onClick={() => onChange({ ...filter, mineOnly: !filter.mineOnly })}
                    className={cn(
                      "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                      filter.mineOnly
                        ? "bg-slate-900 dark:bg-neutral-100"
                        : "bg-slate-200 dark:bg-neutral-700"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform dark:bg-neutral-900",
                        filter.mineOnly && "translate-x-5 dark:bg-neutral-950"
                      )}
                    />
                  </button>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>แท็ก</Label>
                {tagOptions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {tagOptions.map((tag) => {
                      const active = filter.tagKeys.includes(tag.key)
                      return (
                        <button
                          key={tag.key}
                          type="button"
                          onClick={() => toggleTag(tag.key)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                            active
                              ? "border-slate-400 bg-slate-100 text-slate-900 dark:border-neutral-500 dark:bg-neutral-800 dark:text-neutral-100"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-900"
                          )}
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          {tag.label}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-neutral-500">
                    ยังไม่มีแท็กที่บันทึกไว้
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-neutral-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!isActive}
                  onClick={() => onChange(EMPTY_APPOINTMENT_FILTER)}
                >
                  ล้างตัวกรอง
                </Button>
                <Button type="button" size="sm" onClick={() => setOpen(false)}>
                  เสร็จสิ้น
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
