import type { HistoryPoint } from "@/lib/portfolio/analytics/dashboard";

export const PERFORMANCE_RANGES = ["1M", "3M", "6M", "YTD", "1Y", "ALL"] as const;
export type PerformanceRange = (typeof PERFORMANCE_RANGES)[number];

export type MonthlyPerformance = {
  /** "YYYY-MM". */
  month: string;
  /** Market gain in USD, excluding money added or withdrawn. Null when the month has no measurable change. */
  gain: number | null;
  /** Modified Dietz return for the month, 0–100 scale. */
  returnPercentage: number | null;
  /** Snapshot the change is measured from. Can be several months earlier when months were skipped. */
  fromDate: string | null;
  /** Last snapshot of the month. */
  toDate: string | null;
  /** The month of the very first snapshot: there is nothing earlier to compare against. */
  isBaseline: boolean;
};

const monthOf = (isoDate: string) => isoDate.slice(0, 7);

export function addMonths(month: string, count: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const index = year * 12 + (monthNumber - 1) + count;

  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

const emptyMonth = (month: string): MonthlyPerformance => ({
  month,
  gain: null,
  returnPercentage: null,
  fromDate: null,
  toDate: null,
  isBaseline: false,
});

/**
 * One entry per calendar month from the first snapshot to the latest, measured
 * from each month's last snapshot to the previous month-end snapshot.
 *
 * Gain is the change in unrealised P&L, so new money does not count as
 * performance. The return divides it by the starting value plus half the net
 * money added (Modified Dietz), which assumes flows landed mid-period.
 * Snapshots are sparse, so a month with no snapshot is empty and the next
 * month with one carries the whole change since the last snapshot.
 */
export function buildMonthlyPerformance(history: HistoryPoint[]): MonthlyPerformance[] {
  const first = history[0];
  const last = history.at(-1);

  if (!first || !last) {
    return [];
  }

  const monthEnds = new Map<string, HistoryPoint>();
  for (const point of history) {
    monthEnds.set(monthOf(point.snapshotDate), point);
  }

  const months: MonthlyPerformance[] = [];
  let previous: HistoryPoint | null = null;

  for (let month = monthOf(first.snapshotDate); month <= monthOf(last.snapshotDate); month = addMonths(month, 1)) {
    const point = monthEnds.get(month);

    if (!point) {
      months.push(emptyMonth(month));
      continue;
    }

    if (!previous) {
      months.push({ ...emptyMonth(month), toDate: point.snapshotDate, isBaseline: true });
    } else {
      const gain = point.pnlAmount - previous.pnlAmount;
      const netFlow = point.investedAmount - previous.investedAmount;
      const base = previous.currentValue + netFlow / 2;

      months.push({
        month,
        gain,
        returnPercentage: base > 0 ? (gain / base) * 100 : null,
        fromDate: previous.snapshotDate,
        toDate: point.snapshotDate,
        isBaseline: false,
      });
    }

    previous = point;
  }

  return months;
}

/**
 * The months a range covers, ending at the latest snapshot's month. Months
 * before the first snapshot are included as empty, so YTD always starts in
 * January.
 */
export function selectMonthlyRange(months: MonthlyPerformance[], range: PerformanceRange): MonthlyPerformance[] {
  const latest = months.at(-1)?.month;

  if (!latest) {
    return [];
  }

  const start = {
    "1M": latest,
    "3M": addMonths(latest, -2),
    "6M": addMonths(latest, -5),
    YTD: `${latest.slice(0, 4)}-01`,
    "1Y": addMonths(latest, -11),
    ALL: months[0].month,
  }[range];

  const byMonth = new Map(months.map((entry) => [entry.month, entry]));
  const selected: MonthlyPerformance[] = [];

  for (let month = start; month <= latest; month = addMonths(month, 1)) {
    selected.push(byMonth.get(month) ?? emptyMonth(month));
  }

  return selected;
}
