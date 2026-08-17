export const SEMESTER_OPEN_DATE = new Date(2026, 7, 3);
export const PROGRAM_DURATION_DAYS = 6 * 365;

export type HeroStatsProps = {
  memberCount: number;
  daysSinceSemesterOpen: number;
  initialCountdown: CountdownParts;
};

export type CountdownParts = {
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

export function getCountdownParts(
  now = new Date(),
  end = getProgramEndDate()
): CountdownParts {
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
