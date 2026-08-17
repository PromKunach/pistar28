export const SEMESTER_OPEN_DATE = new Date(2026, 7, 3);
export const PROGRAM_DURATION_DAYS = 6 * 365;

export type HeroStatsProps = {
  memberCount: number;
  daysSinceSemesterOpen: number;
};

export function getDaysSinceSemesterOpen(from = new Date()) {
  const start = new Date(
    SEMESTER_OPEN_DATE.getFullYear(),
    SEMESTER_OPEN_DATE.getMonth(),
    SEMESTER_OPEN_DATE.getDate()
  );
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const diffMs = today.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function getProgramDaysRemaining(daysSinceOpen: number) {
  return Math.max(0, PROGRAM_DURATION_DAYS - daysSinceOpen);
}
