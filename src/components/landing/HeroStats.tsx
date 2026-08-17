"use client";

import { useEffect, useState } from "react";
import { NumberTicker } from "@/components/ui/number-ticker";
import {
  PROGRAM_DURATION_DAYS,
  SEMESTER_OPEN_DATE,
  type HeroStatsProps,
} from "@/components/landing/hero-stats-utils";

type StatItem = {
  value: number;
  label: string;
  suffix: string;
};

type CountdownParts = {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const MS_SECOND = 1000;
const MS_MINUTE = 60 * MS_SECOND;
const MS_HOUR = 60 * MS_MINUTE;
const MS_DAY = 24 * MS_HOUR;
const MS_MONTH = 30 * MS_DAY;
const MS_YEAR = 365 * MS_DAY;

export function getProgramEndDate() {
  const start = new Date(
    SEMESTER_OPEN_DATE.getFullYear(),
    SEMESTER_OPEN_DATE.getMonth(),
    SEMESTER_OPEN_DATE.getDate()
  );
  return new Date(start.getTime() + PROGRAM_DURATION_DAYS * MS_DAY);
}

export function getCountdownParts(now = new Date(), end = getProgramEndDate()): CountdownParts {
  let diff = Math.max(0, end.getTime() - now.getTime());

  const years = Math.floor(diff / MS_YEAR);
  diff -= years * MS_YEAR;
  const months = Math.floor(diff / MS_MONTH);
  diff -= months * MS_MONTH;
  const days = Math.floor(diff / MS_DAY);
  diff -= days * MS_DAY;
  const hours = Math.floor(diff / MS_HOUR);
  diff -= hours * MS_HOUR;
  const minutes = Math.floor(diff / MS_MINUTE);
  diff -= minutes * MS_MINUTE;
  const seconds = Math.floor(diff / MS_SECOND);

  return { years, months, days, hours, minutes, seconds };
}

const COUNTDOWN_UNITS: { key: keyof CountdownParts; label: string }[] = [
  { key: "years", label: "ปี" },
  { key: "months", label: "เดือน" },
  { key: "days", label: "วัน" },
  { key: "hours", label: "ชั่วโมง" },
  { key: "minutes", label: "นาที" },
  { key: "seconds", label: "วินาที" },
];

function HeroProgramCountdown() {
  const [parts, setParts] = useState<CountdownParts>(() => getCountdownParts());

  useEffect(() => {
    const tick = () => setParts(getCountdownParts());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative z-10 mb-6 flex w-full flex-col items-center sm:mb-8">
      <div className="flex w-full flex-wrap items-center justify-center gap-4 sm:gap-6">
        {COUNTDOWN_UNITS.map((unit) => (
          <div
            key={unit.key}
            className="flex items-baseline gap-1 text-center sm:gap-1.5"
          >
            <span className="text-2xl font-semibold tabular-nums text-neutral-900 sm:text-3xl dark:text-neutral-100">
              {parts[unit.key]}
            </span>
            <span className="text-xs text-slate-500 sm:text-sm dark:text-neutral-400">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-sm text-slate-500 sm:text-base dark:text-neutral-400">
        จนถึงวันที่ได้เป็นหมอ...
      </p>
    </div>
  );
}

export function HeroStats({
  memberCount,
  daysSinceSemesterOpen,
}: HeroStatsProps) {
  const daysRemaining = Math.max(0, PROGRAM_DURATION_DAYS - daysSinceSemesterOpen);

  const stats: StatItem[] = [
    { value: memberCount, label: "สมาชิกปัจจุบัน", suffix: "คน" },
    { value: daysSinceSemesterOpen, label: "วันตั้งเเต่เปิดเทอม", suffix: "วัน" },
    { value: daysRemaining, label: "นับถอยหลังจนเรียนจบ", suffix: "วัน" },
  ];

  return (
    <div className="relative z-10 w-full">
      <HeroProgramCountdown />

      <div className="flex w-full flex-row flex-wrap items-start justify-center gap-y-4 pt-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="mr-5 flex w-full items-center rounded-xl bg-white pl-4 shadow-xl ring-1 ring-slate-200 lg:w-[250px]"
          >
            <div className="flex flex-col items-start rounded-xl border border-transparent px-3 py-4 text-left sm:px-4 sm:py-5">
              <span className="text-sm text-slate-500 sm:text-md dark:text-neutral-400">
                {stat.label}
              </span>
              <NumberTicker
                className="text-3xl font-semibold tabular-nums text-neutral-900 sm:text-3xl dark:text-neutral-100"
                value={stat.value}
              />
              <span className="text-sm text-slate-500 sm:text-md dark:text-neutral-400">
                {stat.suffix}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
