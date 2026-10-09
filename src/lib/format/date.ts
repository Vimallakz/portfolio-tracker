/**
 * Snapshot dates are calendar dates (YYYY-MM-DD) with no time zone, so they are
 * formatted in UTC to avoid shifting a day in timezones west of UTC.
 */
const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

/** "3 hours ago", "yesterday", "just now". */
export function formatRelativeTime(isoTimestamp: string, now: Date = new Date()): string {
  const elapsed = new Date(isoTimestamp).getTime() - now.getTime();
  const format = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(elapsed) >= ms) {
      return format.format(Math.round(elapsed / ms), unit);
    }
  }

  return "just now";
}

export function formatSnapshotDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}
