"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import {
  fieldClass,
  getAppointmentAccentColor,
  MiniDatePicker,
  TagSelector,
} from "@/app/(app)/appointment/appointment-ui"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  appointmentDateLabel,
  appointmentDescriptionDisplay,
  appointmentTagLabel,
  fetchSeriesMembersForRecord,
  recordToEditDraft,
  type AppointmentEditDraft,
  type AppointmentRecord,
} from "@/lib/appointments"
import type { SavedAppointmentTag } from "@/lib/appointmentTags"
import { cn } from "@/lib/utils"

type DetailTab = "view" | "edit"

export function AppointmentDetailDialog({
  open,
  appointment,
  savedTags,
  onPersistTag,
  initialTab = "view",
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  appointment: AppointmentRecord | null
  savedTags?: SavedAppointmentTag[]
  onPersistTag?: (label: string, color: string) => void | Promise<void>
  initialTab?: DetailTab
  onClose: () => void
  onSave: (draft: AppointmentEditDraft) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [tab, setTab] = useState<DetailTab>(initialTab)
  const [draft, setDraft] = useState<AppointmentEditDraft | null>(null)
  const [seriesMembers, setSeriesMembers] = useState<AppointmentRecord[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !appointment) return

    let cancelled = false
    setTab(initialTab)
    setConfirmDelete(false)
    setError(null)
    setIsSaving(false)
    setIsDeleting(false)
    setDraft(null)
    setSeriesMembers([])

    void fetchSeriesMembersForRecord(appointment).then((members) => {
      if (cancelled) return
      setSeriesMembers(members)
      setDraft(recordToEditDraft(appointment, members))
    })

    return () => {
      cancelled = true
    }
  }, [open, appointment, initialTab])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    document.addEventListener("keydown", handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  const canSave = Boolean(draft?.title.trim()) && !isSaving && !isDeleting

  const handleSave = async () => {
    if (!draft || !canSave) return
    setIsSaving(true)
    setError(null)
    try {
      await onSave(draft)
      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "บันทึกไม่สำเร็จ")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    setIsDeleting(true)
    setError(null)
    try {
      await onDelete()
      onClose()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "ลบไม่สำเร็จ")
      setConfirmDelete(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && appointment && draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="ปิดหน้าต่าง"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="appointment-detail-title"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.8 }}
            className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6 pb-4 dark:border-neutral-800">
              <div>
                <h2
                  id="appointment-detail-title"
                  className="text-lg font-semibold text-slate-900 dark:text-neutral-100"
                >
                  นัดหมาย
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-neutral-500">
                  {appointment.title}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="ปิด">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex border-b border-slate-200 px-6 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setTab("view")}
                className={cn(
                  "px-3 py-2.5 text-sm font-medium transition-colors",
                  tab === "view"
                    ? "border-b-2 border-slate-900 text-slate-900 dark:border-neutral-100 dark:text-neutral-100"
                    : "text-slate-500 hover:text-slate-700 dark:text-neutral-500 dark:hover:text-neutral-300"
                )}
              >
                รายละเอียด
              </button>
              <button
                type="button"
                onClick={() => setTab("edit")}
                className={cn(
                  "px-3 py-2.5 text-sm font-medium transition-colors",
                  tab === "edit"
                    ? "border-b-2 border-slate-900 text-slate-900 dark:border-neutral-100 dark:text-neutral-100"
                    : "text-slate-500 hover:text-slate-700 dark:text-neutral-500 dark:hover:text-neutral-300"
                )}
              >
                แก้ไข
              </button>
            </div>

            <div className="overflow-y-auto p-6 no-scrollbar">
              {tab === "view" ? (
                <div className="space-y-4">
                  <div
                    className="h-1.5 w-full rounded-full"
                    style={{ backgroundColor: getAppointmentAccentColor(appointment) }}
                  />
                  {appointmentTagLabel(appointment) ? (
                    <span
                      className="inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-neutral-400"
                      style={{ borderColor: getAppointmentAccentColor(appointment) }}
                    >
                      {appointmentTagLabel(appointment)}
                    </span>
                  ) : null}
                  <div>
                    <p className="text-base font-semibold text-slate-900 dark:text-neutral-100">
                      {appointment.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-neutral-500">
                      {appointmentDateLabel(appointment, seriesMembers)}
                    </p>
                  </div>
                  {appointmentDescriptionDisplay(appointment.description) ? (
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-neutral-400">
                      {appointmentDescriptionDisplay(appointment.description)}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 dark:text-neutral-500">ไม่มีคำอธิบาย</p>
                  )}
                  <div className="flex justify-end pt-2">
                    <Button type="button" size="sm" onClick={() => setTab("edit")}>
                      แก้ไข
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="edit-appointment-title">ชื่อนัดหมาย</Label>
                    <input
                      id="edit-appointment-title"
                      value={draft.title}
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, title: event.target.value } : current
                        )
                      }
                      className={fieldClass}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950/40">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-neutral-100">
                        ช่วงวันที่
                      </p>
                      <p className="text-xs text-slate-500 dark:text-neutral-500">
                        เปิดเพื่อเลือกวันเริ่มต้นและสิ้นสุด
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={draft.isRange}
                      onClick={() =>
                        setDraft((current) => {
                          if (!current) return current
                          const nextIsRange = !current.isRange
                          return {
                            ...current,
                            isRange: nextIsRange,
                            endDate: nextIsRange
                              ? current.endDate < current.startDate
                                ? current.startDate
                                : current.endDate
                              : current.startDate,
                          }
                        })
                      }
                      className={cn(
                        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                        draft.isRange
                          ? "bg-slate-900 dark:bg-neutral-100"
                          : "bg-slate-200 dark:bg-neutral-700"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform dark:bg-neutral-900",
                          draft.isRange && "translate-x-5 dark:bg-neutral-950"
                        )}
                      />
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {draft.isRange ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <MiniDatePicker
                            label="วันเริ่มต้น"
                            value={draft.startDate}
                            onChange={(startDate) =>
                              setDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      startDate,
                                      endDate:
                                        startDate > current.endDate ? startDate : current.endDate,
                                    }
                                  : current
                              )
                            }
                          />
                          <MiniDatePicker
                            label="วันสิ้นสุด"
                            value={draft.endDate}
                            onChange={(endDate) =>
                              setDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      endDate:
                                        endDate < current.startDate ? current.startDate : endDate,
                                    }
                                  : current
                              )
                            }
                          />
                        </div>
                      </motion.div>
                    ) : (
                      <MiniDatePicker
                        label="วันนัดหมาย"
                        value={draft.startDate}
                        onChange={(startDate) =>
                          setDraft((current) =>
                            current ? { ...current, startDate, endDate: startDate } : current
                          )
                        }
                      />
                    )}
                  </AnimatePresence>

                  <div className="space-y-2">
                    <Label htmlFor="edit-appointment-description">คำอธิบาย</Label>
                    <textarea
                      id="edit-appointment-description"
                      value={draft.description}
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, description: event.target.value } : current
                        )
                      }
                      rows={4}
                      className={cn(fieldClass, "resize-none")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>แท็ก</Label>
                    <TagSelector
                      tone={draft.tone}
                      customTagLabel={draft.customTagLabel}
                      customTagColor={draft.customTagColor}
                      savedTags={savedTags}
                      onPersistTag={onPersistTag}
                      onChange={(tag) =>
                        setDraft((current) => (current ? { ...current, ...tag } : current))
                      }
                    />
                  </div>

                  {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                  <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-neutral-800">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving || isDeleting}>
                      ยกเลิก
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={!canSave}
                    >
                      {isSaving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                    </Button>
                  </div>

                  <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 dark:border-red-900/50 dark:bg-red-950/20">
                    <p className="mb-2 text-xs font-medium text-red-700 dark:text-red-400">โซนอันตราย</p>
                    {confirmDelete ? (
                      <div className="space-y-2">
                        <p className="text-sm text-red-700 dark:text-red-300">
                          {appointment?.series_id || seriesMembers.length > 1
                            ? "ลบนัดหมายทั้งช่วงนี้ถาวร? การกระทำนี้ย้อนกลับไม่ได้"
                            : "ลบนัดหมายนี้ถาวร? การกระทำนี้ย้อนกลับไม่ได้"}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDelete(false)}
                            disabled={isDeleting}
                          >
                            ยกเลิก
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => void handleDelete()}
                            disabled={isDeleting}
                          >
                            {isDeleting ? "กำลังลบ..." : "ยืนยันการลบ"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => void handleDelete()}
                        disabled={isSaving}
                      >
                        ลบนัดหมาย
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
