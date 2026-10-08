import { addMonths, type MonthlyPerformance } from "@/lib/portfolio/analytics/monthly-performance";
import { monthOf, monthsBetween } from "@/lib/portfolio/planner/contributions";

export type EarningsSummary = {
  /** Market gain in USD across the window, excluding money added. */
  totalGain: number;
  /** totalGain spread over the months it covers. */
  averageMonthlyGain: number;
  /** Money-weighted monthly return, 0–100 scale: totalGain over the money at work each month. Null without a base. */
  averageMonthlyReturn: number | null;
  /** Calendar months the measured changes cover. Can exceed the window when a change spans skipped months. */
  monthsCovered: number;
};

/**
 * Market earnings over the last `windowMonths` months ending at the latest
 * month, or the whole history when `windowMonths` is null.
 *
 * The return is money-weighted: total gain divided by the sum of each month's
 * base (the money at work), counting a base once per month its change spans.
 * Its sign always matches the actual gain or loss, unlike averaging monthly
 * percentages, where small early months count as much as large later ones.
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
  const measured = months.filter((entry) => entry.month >= start && entry.gain !== null);

  if (measured.length === 0) {
    return null;
  }

  let totalGain = 0;
  let monthsCovered = 0;
  let moneyAtWork = 0;

  for (const entry of measured) {
    const span = entry.fromDate ? monthsBetween(monthOf(entry.fromDate), entry.month) : 1;

    totalGain += entry.gain!;
    monthsCovered += span;
    moneyAtWork += (entry.base ?? 0) * span;
  }

  return {
    totalGain,
    averageMonthlyGain: totalGain / monthsCovered,
    averageMonthlyReturn: moneyAtWork > 0 ? (totalGain / moneyAtWork) * 100 : null,
    monthsCovered,
  };
}

/** A monthly return as a yearly one, both 0–100 scale. */
export const annualizeMonthlyReturn = (monthlyReturn: number) => ((1 + monthlyReturn / 100) ** 12 - 1) * 100;
