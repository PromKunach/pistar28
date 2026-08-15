"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import {
  fieldClass,
  MiniDatePicker,
  TagSelector,
} from "@/app/(app)/appointment/appointment-ui"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { AppointmentDraft } from "@/lib/appointments"
import type { SavedAppointmentTag } from "@/lib/appointmentTags"
import { cn } from "@/lib/utils"

export type { AppointmentDraft } from "@/lib/appointments"

function createInitialDraft(defaultDate: Date): AppointmentDraft {
  return {
    title: "",
    description: "",
    isRange: false,
    startDate: defaultDate,
    endDate: defaultDate,
    tone: "neutral",
    customTagLabel: null,
    customTagColor: null,
  }
}

export function AddAppointmentDialog({
  open,
  onClose,
  defaultDate,
  savedTags,
  onPersistTag,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  defaultDate: Date
  savedTags?: SavedAppointmentTag[]
  onPersistTag?: (label: string, color: string) => void | Promise<void>
  onSubmit?: (draft: AppointmentDraft) => void | Promise<void>
}) {
  const [draft, setDraft] = useState(() => createInitialDraft(defaultDate))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDraft(createInitialDraft(defaultDate))
    setSubmitError(null)
    setIsSubmitting(false)
  }, [open, defaultDate])

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

  const canSubmit = draft.title.trim().length > 0 && !isSubmitting

  return (
    <AnimatePresence>
      {open && (
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

          <motion.form
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-appointment-title"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.8 }}
            onSubmit={(event) => {
              event.preventDefault()
              if (!canSubmit || !onSubmit) return

              void (async () => {
                setIsSubmitting(true)
                setSubmitError(null)
                try {
                  await onSubmit(draft)
                  onClose()
                } catch (error) {
                  setSubmitError(
                    error instanceof Error ? error.message : "บันทึกนัดหมายไม่สำเร็จ"
                  )
                } finally {
                  setIsSubmitting(false)
                }
              })()
            }}
            className="relative z-10 max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl no-scrollbar dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="add-appointment-title"
                  className="text-lg font-semibold text-slate-900 dark:text-neutral-100"
                >
                  เพิ่มนัดหมายใหม่
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-neutral-500">
                  กรอกรายละเอียดนัดหมายของคุณ
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="ปิด">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="appointment-title">ชื่อนัดหมาย</Label>
              <input
                id="appointment-title"
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="เช่น ประชุมทีม, นำเสนอผลงาน"
                className={fieldClass}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950/40">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-neutral-100">ช่วงวันที่</p>
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
                        setDraft((current) => ({
                          ...current,
                          startDate,
                          endDate: startDate > current.endDate ? startDate : current.endDate,
                        }))
                      }
                    />
                    <MiniDatePicker
                      label="วันสิ้นสุด"
                      value={draft.endDate}
                      onChange={(endDate) =>
                        setDraft((current) => ({
                          ...current,
                          endDate: endDate < current.startDate ? current.startDate : endDate,
                        }))
                      }
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <MiniDatePicker
                    label="วันนัดหมาย"
                    value={draft.startDate}
                    onChange={(startDate) =>
                      setDraft((current) => ({
                        ...current,
                        startDate,
                        endDate: startDate,
                      }))
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <Label htmlFor="appointment-description">คำอธิบาย</Label>
              <textarea
                id="appointment-description"
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
                rows={4}
                placeholder="รายละเอียดเพิ่มเติม..."
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
                onChange={(tag) => setDraft((current) => ({ ...current, ...tag }))}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-neutral-800">
              {submitError && (
                <p className="mr-auto text-sm text-red-600 dark:text-red-400">{submitError}</p>
              )}
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={!canSubmit || !onSubmit}>
                {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  )
}
