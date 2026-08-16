"use client"

import { useEffect, useMemo, useRef } from "react"
import { AnimatePresence, motion } from "motion/react"

import {
  buildDateCardTheme,
  useIsDarkMode,
} from "@/app/(app)/appointment/appointment-ui"
import { cn } from "@/lib/utils"

const THEME_TRANSITION = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const }
const FRAME_TRANSITION = { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const }

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

type CardContentProps = {
  date: Date
  themed: boolean
  theme: ReturnType<typeof buildDateCardTheme> | null
  isSameMonth: boolean
  monthYearLabel: string
  weekdayLabel: string
  contentMinHeight: string
  dayTextClass: string
  monthTextClass: string
  weekdayTextClass: string
  paddingClass: string
  dayAreaHeight: string
}

function PaperDateCardContent({
  date,
  themed,
  theme,
  isSameMonth,
  monthYearLabel,
  weekdayLabel,
  contentMinHeight,
  dayTextClass,
  monthTextClass,
  weekdayTextClass,
  paddingClass,
  dayAreaHeight,
}: CardContentProps) {
  if (isSameMonth) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center text-center",
          contentMinHeight,
          paddingClass
        )}
      >
        {themed && theme ? (
          <motion.p
            animate={{ color: theme.monthText }}
            transition={THEME_TRANSITION}
            className={cn("font-medium", monthTextClass)}
          >
            {monthYearLabel}
          </motion.p>
        ) : (
          <p className={cn("font-medium text-slate-600 dark:text-neutral-400", monthTextClass)}>
            {monthYearLabel}
          </p>
        )}
        <div
          className={cn(
            "mt-1 flex items-center justify-center overflow-hidden",
            dayAreaHeight
          )}
        >
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
                "font-semibold tracking-tight",
                dayTextClass,
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
            className={cn("mt-3", weekdayTextClass)}
          >
            {weekdayLabel}
          </motion.p>
        ) : (
          <p className={cn("mt-3 text-slate-500 dark:text-neutral-500", weekdayTextClass)}>
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
        className={cn(
          "flex flex-col items-center justify-center text-center",
          contentMinHeight,
          paddingClass
        )}
      >
        {themed && theme ? (
          <motion.p
            animate={{ color: theme.monthText }}
            transition={THEME_TRANSITION}
            className={cn("font-medium", monthTextClass)}
          >
            {monthYearLabel}
          </motion.p>
        ) : (
          <p className={cn("font-medium text-slate-600 dark:text-neutral-400", monthTextClass)}>
            {monthYearLabel}
          </p>
        )}
        {themed && theme ? (
          <motion.p
            animate={{ color: theme.dayText }}
            transition={THEME_TRANSITION}
            className={cn("mt-2 font-semibold tracking-tight", dayTextClass)}
          >
            {date.getDate()}
          </motion.p>
        ) : (
          <p
            className={cn(
              "mt-2 font-semibold tracking-tight text-slate-900 dark:text-neutral-100",
              dayTextClass
            )}
          >
            {date.getDate()}
          </p>
        )}
        {themed && theme ? (
          <motion.p
            animate={{ color: theme.weekdayText }}
            transition={THEME_TRANSITION}
            className={cn("mt-3", weekdayTextClass)}
          >
            {weekdayLabel}
          </motion.p>
        ) : (
          <p className={cn("mt-3 text-slate-500 dark:text-neutral-500", weekdayTextClass)}>
            {weekdayLabel}
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

export function PaperDateCard({
  date,
  accentColor,
  compact,
  mini,
}: {
  date: Date
  accentColor?: string | null
  compact?: boolean
  mini?: boolean
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

  const sizeProps = mini
    ? {
        contentMinHeight: "min-h-[5.25rem]",
        dayTextClass: "text-3xl",
        monthTextClass: "text-[11px]",
        weekdayTextClass: "text-[10px]",
        paddingClass: "px-2 py-2.5",
        dayAreaHeight: "h-[2.25rem]",
      }
    : compact
      ? {
          contentMinHeight: "min-h-[10rem]",
          dayTextClass: "text-5xl",
          monthTextClass: "text-base",
          weekdayTextClass: "text-sm",
          paddingClass: "px-4 py-6",
          dayAreaHeight: "h-[4.5rem]",
        }
      : {
          contentMinHeight: "min-h-[14.5rem]",
          dayTextClass: "text-7xl",
          monthTextClass: "text-xl",
          weekdayTextClass: "text-base",
          paddingClass: "px-8 py-10",
          dayAreaHeight: "h-[4.5rem]",
        }

  const contentProps = {
    date,
    themed,
    theme,
    isSameMonth,
    monthYearLabel,
    weekdayLabel,
    ...sizeProps,
  }
  const ringHeight = mini ? "h-6" : compact ? "h-10" : "h-14"
  const topPadding = mini ? "pt-2" : "pt-5"
  const stackHeight = mini ? "h-1" : "h-2"

  return (
    <div className="flex w-full flex-col items-center">
      <div className={cn("relative w-full", mini ? "pt-1.5" : "pt-3")}>
        <div
          aria-hidden="true"
          className={cn("pointer-events-none absolute -top-2 inset-x-0 z-10", ringHeight)}
        >
          {themed ? (
            <>
              <motion.span
                animate={{
                  backgroundColor: theme!.ringBackground,
                  borderColor: theme!.ringBorder,
                }}
                transition={THEME_TRANSITION}
                className={cn(
                  "absolute top-0 left-[20%] w-2 -translate-x-1/2 rounded-[5px] border",
                  ringHeight
                )}
              />
              <motion.span
                animate={{
                  backgroundColor: theme!.ringBackground,
                  borderColor: theme!.ringBorder,
                }}
                transition={THEME_TRANSITION}
                className={cn(
                  "absolute top-0 left-[80%] w-2 -translate-x-1/2 rounded-[5px] border",
                  ringHeight
                )}
              />
            </>
          ) : (
            <>
              <span
                className={cn(
                  "absolute top-0 left-[20%] w-2 -translate-x-1/2 rounded-[5px] border border-slate-300/80 bg-slate-300 dark:border-neutral-600 dark:bg-neutral-700",
                  ringHeight
                )}
              />
              <span
                className={cn(
                  "absolute top-0 left-[80%] w-2 -translate-x-1/2 rounded-[5px] border border-slate-300/80 bg-slate-300 dark:border-neutral-600 dark:bg-neutral-700",
                  ringHeight
                )}
              />
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
            className={cn(
              "w-full overflow-hidden rounded-xl border shadow-sm",
              topPadding
            )}
          >
            <PaperDateCardContent {...contentProps} />
          </motion.div>
        ) : (
          <div
            className={cn(
              "w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900",
              topPadding
            )}
          >
            <PaperDateCardContent {...contentProps} />
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
            className={cn("mt-1 rounded-b-lg rounded-t-none", stackHeight, layer.width)}
          />
        ) : (
          <div
            key={index}
            aria-hidden="true"
            className={cn(
              "mt-1 rounded-b-lg rounded-t-none",
              stackHeight,
              layer.width,
              "className" in layer ? layer.className : undefined
            )}
          />
        )
      )}
    </div>
  )
}
