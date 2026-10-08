import type { HistoryPoint } from "@/lib/portfolio/analytics/dashboard";
import { addMonths } from "@/lib/portfolio/analytics/monthly-performance";

export type MonthlyContribution = {
  /** "YYYY-MM". */
  month: string;
  /** Net money added in USD (negative when more was sold than bought). Null for the baseline month. */
  amount: number | null;
  /** True when no snapshot fell in this month, or the snapshot covers skipped months, so the amount is an even split. */
  isEstimated: boolean;
  /** Snapshot the change is measured from. */
  fromDate: string | null;
  /** Snapshot the change is measured to. */
  toDate: string | null;
  /** The month of the very first snapshot: money invested before tracking started is unknown. */
  isBaseline: boolean;
};

export type ContributionAverage = {
  /** Mean net money added per month, USD. Null when no month in the window has an amount. */
  average: number | null;
  /** Months that had an amount, out of the requested window. */
  monthsCounted: number;
};

export const monthOf = (isoDate: string) => isoDate.slice(0, 7);

export function monthsBetween(fromMonth: string, toMonth: string): number {
  const index = (month: string) => {
    const [year, monthNumber] = month.split("-").map(Number);
    return year * 12 + monthNumber;
  };

  return index(toMonth) - index(fromMonth);
}

/**
 * Net money added each calendar month, from the change in invested amount
 * between month-end snapshots. Invested amount is the USD cost basis, so this
 * is what was actually put in whatever the INR rate was on the day.
 *
 * When months were skipped, the change up to the next snapshot is split evenly
 * across every month it spans, and those months are marked estimated.
 */
export function buildMonthlyContributions(history: HistoryPoint[]): MonthlyContribution[] {
  const first = history[0];
  const last = history.at(-1);

  if (!first || !last) {
    return [];
  }

  const monthEnds = new Map<string, HistoryPoint>();
  for (const point of history) {
    monthEnds.set(monthOf(point.snapshotDate), point);
  }

  const months: MonthlyContribution[] = [
    {
      month: monthOf(first.snapshotDate),
      amount: null,
      isEstimated: false,
      fromDate: null,
      toDate: monthEnds.get(monthOf(first.snapshotDate))!.snapshotDate,
      isBaseline: true,
    },
  ];

  let previous = monthEnds.get(monthOf(first.snapshotDate))!;

  for (
    let month = addMonths(monthOf(first.snapshotDate), 1);
    month <= monthOf(last.snapshotDate);
    month = addMonths(month, 1)
  ) {
    const point = monthEnds.get(month);

    if (!point) {
      continue;
    }

    const span = monthsBetween(monthOf(previous.snapshotDate), month);
    const perMonth = (point.investedAmount - previous.investedAmount) / span;

    for (let offset = span - 1; offset >= 0; offset--) {
      months.push({
        month: addMonths(month, -offset),
        amount: perMonth,
        isEstimated: span > 1,
        fromDate: previous.snapshotDate,
        toDate: point.snapshotDate,
        isBaseline: false,
      });
    }

    previous = point;
  }

  return months;
}

/** Mean of the last `windowMonths` calendar months ending at the latest month, ignoring the baseline. */
export function averageContribution(months: MonthlyContribution[], windowMonths: number): ContributionAverage {
  const latest = months.at(-1)?.month;

  if (!latest) {
    return { average: null, monthsCounted: 0 };
  }

  const start = addMonths(latest, -(windowMonths - 1));
  const amounts = months
    .filter((entry) => entry.month >= start && entry.amount !== null)
    .map((entry) => entry.amount!);

  return {
    average: amounts.length > 0 ? amounts.reduce((sum, value) => sum + value, 0) / amounts.length : null,
    monthsCounted: amounts.length,
  };
}
