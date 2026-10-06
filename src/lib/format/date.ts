/**
 * Snapshot dates are calendar dates (YYYY-MM-DD) with no time zone, so they are
 * formatted in UTC to avoid shifting a day in timezones west of UTC.
 */
export function formatSnapshotDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}
