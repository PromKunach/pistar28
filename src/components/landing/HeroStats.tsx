"use client";

import { useEffect, useState } from "react";
import { NumberTicker } from "@/components/ui/number-ticker";
import {
  PROGRAM_DURATION_DAYS,
  getCountdownParts,
  type CountdownParts,
  type HeroStatsProps,
} from "@/components/landing/hero-stats-utils";

type StatItem = {
  value: number;
  label: string;
  suffix: string;
};

const COUNTDOWN_UNITS: { key: keyof CountdownParts; label: string }[] = [
  { key: "years", label: "ปี" },
  { key: "months", label: "เดือน" },
  { key: "days", label: "วัน" },
  { key: "hours", label: "ชั่วโมง" },
  { key: "minutes", label: "นาที" },
  { key: "seconds", label: "วินาที" },
];

function HeroProgramCountdown({
  initialParts,
}: {
  initialParts: CountdownParts;
}) {
  const [parts, setParts] = useState<CountdownParts>(initialParts);

  useEffect(() => {
    const tick = () => setParts(getCountdownParts());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative z-10 mb-5 flex w-full min-w-0 flex-col items-center sm:mb-8">
      <div className="grid w-full max-w-md grid-cols-3 gap-x-2 gap-y-3 sm:flex sm:max-w-none sm:flex-wrap sm:items-center sm:justify-center sm:gap-4 md:gap-6">
        {COUNTDOWN_UNITS.map((unit) => (
          <div
            key={unit.key}
            className="flex flex-col items-center gap-0.5 text-center sm:flex-row sm:items-baseline sm:gap-1.5"
          >
            <span
              className="text-xl font-semibold tabular-nums text-foreground sm:text-2xl md:text-3xl"
              suppressHydrationWarning
            >
              {parts[unit.key]}
            </span>
            <span className="text-[10px] text-muted-foreground sm:text-xs md:text-sm">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground sm:mt-4 sm:text-sm md:text-base">
        จนถึงวันที่ได้เป็นหมอ...
      </p>
    </div>
  );
}

export function HeroStats({
  memberCount,
  daysSinceSemesterOpen,
  initialCountdown,
}: HeroStatsProps) {
  const daysRemaining = Math.max(0, PROGRAM_DURATION_DAYS - daysSinceSemesterOpen);

  const stats: StatItem[] = [
    { value: memberCount, label: "สมาชิกปัจจุบัน", suffix: "คน" },
    { value: daysSinceSemesterOpen, label: "เปิดเทอมมาเเล้ว", suffix: "วัน" },
    { value: daysRemaining, label: "นับถอยหลังจนเรียนจบ", suffix: "วัน" },
  ];

  return (
    <div className="relative z-10 w-full min-w-0">
      <HeroProgramCountdown initialParts={initialCountdown} />

      <div className="grid w-full grid-cols-1 gap-3 pt-2 sm:grid-cols-3 sm:gap-4 sm:pt-14">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex w-full min-w-0 items-center rounded-xl border border-border bg-card pl-2 shadow-sm"
          >
            <div className="flex w-full min-w-0 flex-col items-start rounded-xl border border-transparent px-4 py-3.5 text-left sm:px-4 sm:py-5">
              <span className="text-xs text-muted-foreground sm:text-sm">
                {stat.label}
              </span>
              <NumberTicker
                className="text-2xl font-semibold tabular-nums text-foreground sm:text-3xl"
                value={stat.value}
              />
              <span className="text-xs text-muted-foreground sm:text-sm">
                {stat.suffix}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
