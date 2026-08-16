"use client"

import { AnimatePresence, motion } from "motion/react"

import {
  fieldClass,
  MiniDatePicker,
  TagSelector,
} from "@/app/(app)/appointment/appointment-ui"
import { Label } from "@/components/ui/label"
import type { AppointmentDraft } from "@/lib/appointments"
import type { SavedAppointmentTag } from "@/lib/appointmentTags"
import { cn } from "@/lib/utils"

export function AppointmentFormFields({
  draft,
  onChange,
  savedTags,
  onPersistTag,
  idPrefix = "appointment",
  hideTitleAndDescription = false,
}: {
  draft: AppointmentDraft
  onChange: (draft: AppointmentDraft) => void
  savedTags?: SavedAppointmentTag[]
  onPersistTag?: (label: string, color: string) => void | Promise<void>
  idPrefix?: string
  hideTitleAndDescription?: boolean
}) {
  return (
    <div className="space-y-5">
      {!hideTitleAndDescription ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-title`}>ชื่อนัดหมาย</Label>
          <input
            id={`${idPrefix}-title`}
            value={draft.title}
            onChange={(event) => onChange({ ...draft, title: event.target.value })}
            placeholder="เช่น ประชุมทีม, นำเสนอผลงาน"
            className={fieldClass}
          />
        </div>
      ) : null}

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
            onChange({
              ...draft,
              isRange: !draft.isRange,
              endDate: !draft.isRange
                ? draft.endDate < draft.startDate
                  ? draft.startDate
                  : draft.endDate
                : draft.startDate,
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
                  onChange({
                    ...draft,
                    startDate,
                    endDate: startDate > draft.endDate ? startDate : draft.endDate,
                  })
                }
              />
              <MiniDatePicker
                label="วันสิ้นสุด"
                value={draft.endDate}
                onChange={(endDate) =>
                  onChange({
                    ...draft,
                    endDate: endDate < draft.startDate ? draft.startDate : endDate,
                  })
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
                onChange({
                  ...draft,
                  startDate,
                  endDate: startDate,
                })
              }
            />
          </motion.div>
        )}
      </AnimatePresence>

      {!hideTitleAndDescription ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-description`}>คำอธิบาย</Label>
          <textarea
            id={`${idPrefix}-description`}
            value={draft.description}
            onChange={(event) => onChange({ ...draft, description: event.target.value })}
            rows={4}
            placeholder="รายละเอียดเพิ่มเติม..."
            className={cn(fieldClass, "resize-none")}
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>แท็ก</Label>
        <TagSelector
          tone={draft.tone}
          customTagLabel={draft.customTagLabel}
          customTagColor={draft.customTagColor}
          savedTags={savedTags}
          onPersistTag={onPersistTag}
          onChange={(tag) => onChange({ ...draft, ...tag })}
        />
      </div>
    </div>
  )
}
