import { addMonths, type MonthlyPerformance } from "@/lib/portfolio/analytics/monthly-performance";
import { monthOf, monthsBetween } from "@/lib/portfolio/planner/contributions";

export type EarningsSummary = {
  /** Market gain in USD across the window, excluding money added. */
  totalGain: number;
  /** totalGain spread over the months it covers. */
  averageMonthlyGain: number;
  /** Compounded monthly return, 0–100 scale. Null when no measured month had a usable base. */
  averageMonthlyReturn: number | null;
  /** Calendar months the measured changes cover. Can exceed the window when a change spans skipped months. */
  monthsCovered: number;
};

/**
 * Market earnings over the last `windowMonths` months ending at the latest
 * month, or the whole history when `windowMonths` is null.
 *
 * The return is the geometric mean of the monthly Modified Dietz returns, so a
 * change measured across skipped months counts once per month it spans.
 */
export function summarizeEarnings(
  months: MonthlyPerformance[],
  windowMonths: number | null,
): EarningsSummary | null {
  const latest = months.at(-1)?.month;

  if (!latest) {
    return null;
  }

  const start = windowMonths === null ? months[0].month : addMonths(latest, -(windowMonths - 1));
  const measured = months.filter((entry) => entry.month >= start && entry.gain !== null && entry.fromDate !== null);

  if (measured.length === 0) {
    return null;
  }

  let totalGain = 0;
  let monthsCovered = 0;
  let growth = 1;
  let returnMonths = 0;

  for (const entry of measured) {
    const span = monthsBetween(monthOf(entry.fromDate!), entry.month);

    totalGain += entry.gain!;
    monthsCovered += span;

    if (entry.returnPercentage !== null) {
      growth *= 1 + entry.returnPercentage / 100;
      returnMonths += span;
    }
  }

  return {
    totalGain,
    averageMonthlyGain: totalGain / monthsCovered,
    averageMonthlyReturn: returnMonths > 0 && growth > 0 ? (growth ** (1 / returnMonths) - 1) * 100 : null,
    monthsCovered,
  };
}

/** A monthly return as a yearly one, both 0–100 scale. */
export const annualizeMonthlyReturn = (monthlyReturn: number) => ((1 + monthlyReturn / 100) ** 12 - 1) * 100;
