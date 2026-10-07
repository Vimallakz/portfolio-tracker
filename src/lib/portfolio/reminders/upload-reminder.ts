import { addMonths } from "@/lib/portfolio/analytics/monthly-performance";

/**
 * Calendar dates are judged in the owner's time zone, not the server's: the
 * host runs in UTC, which would open and close the window 5.5 hours late.
 */
export const REMINDER_TIME_ZONE = "Asia/Kolkata";

/** Days of the month that count as month-end, and the grace days after it. */
const MONTH_END_FROM_DAY = 28;
const GRACE_UNTIL_DAY = 5;

export type UploadReminderWindow = {
  /** The month the CSV is for, "YYYY-MM". */
  month: string;
  /** First date (inclusive) a snapshot counts as this month's month-end. */
  coveredFrom: string;
  /** Last date (inclusive), the final day of the month. */
  coveredTo: string;
  /** Date to prefill on the import form. */
  suggestedDate: string;
  /** True on days 1–5, when the month has already ended. */
  isOverdue: boolean;
};

export function todayInTimeZone(now: Date, timeZone: string = REMINDER_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function lastDayOfMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const day = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

  return `${month}-${String(day).padStart(2, "0")}`;
}

/**
 * The month-end upload window `today` falls in, or null outside it. Days 28 to
 * the end of a month ask for that month; days 1–5 ask for the month just
 * ended, prefilled with its last day so the snapshot is counted in that month.
 */
export function getUploadReminderWindow(today: string): UploadReminderWindow | null {
  const day = Number(today.slice(8, 10));
  const currentMonth = today.slice(0, 7);

  let month: string;
  let isOverdue: boolean;

  if (day >= MONTH_END_FROM_DAY) {
    month = currentMonth;
    isOverdue = false;
  } else if (day <= GRACE_UNTIL_DAY) {
    month = addMonths(currentMonth, -1);
    isOverdue = true;
  } else {
    return null;
  }

  const coveredTo = lastDayOfMonth(month);

  return {
    month,
    coveredFrom: `${month}-${MONTH_END_FROM_DAY}`,
    coveredTo,
    suggestedDate: isOverdue ? coveredTo : today,
    isOverdue,
  };
}
