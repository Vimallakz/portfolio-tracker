import type { HistoryPoint } from "@/lib/portfolio/analytics/dashboard";
import { buildMonthlyPerformance, type MonthlyPerformance } from "@/lib/portfolio/analytics/monthly-performance";
import { monthOf } from "@/lib/portfolio/planner/contributions";
import type { ReportPeriod } from "@/lib/portfolio/reports/period";

/** A snapshot from this day of the period's last month counts as month-end, like the upload reminder. */
const MONTH_END_FROM_DAY = 28;

export type PortfolioReport = {
  period: ReportPeriod;
  /** Snapshot the period is measured from: the last one before it starts. Null when the period contains the first snapshot. */
  startDate: string | null;
  /** Last snapshot in the period. */
  endDate: string;
  startValue: number;
  startInvested: number;
  /** Net money added during the period. */
  moneyInvested: number;
  /** Change in P&L during the period, which excludes new money. */
  marketGain: number;
  endValue: number;
  /** Market gain over the money at work (Modified Dietz), 0–100 scale. Null without a base. */
  periodReturn: number | null;
  endInvested: number;
  /** Profit or loss on everything invested, at the end of the period. */
  endPnl: number;
  /** endPnl over endInvested, 0–100 scale. Null when nothing is invested. */
  returnOnInvested: number | null;
  /** The last snapshot is not a month-end one in the period's final month, so the report runs only to endDate. */
  isPartial: boolean;
  /** Value and invested at each snapshot in the period, starting from the snapshot it is measured from. */
  valueSeries: HistoryPoint[];
  /** Market gain each month of the period that has data. */
  monthly: MonthlyPerformance[];
};

/**
 * A report for `period`, measured like the rest of the app: from the last
 * snapshot before the period to the last one inside it. When the period holds
 * the first snapshot, it starts from zero, as if investing began then. Null
 * when the period has no snapshot.
 */
export function buildReport(history: HistoryPoint[], period: ReportPeriod): PortfolioReport | null {
  const before = history.filter((point) => monthOf(point.snapshotDate) < period.start);
  const inside = history.filter((point) => {
    const month = monthOf(point.snapshotDate);
    return month >= period.start && month <= period.end;
  });

  const start = before.at(-1) ?? null;
  const end = inside.at(-1);

  if (!end) {
    return null;
  }

  const startValue = start?.currentValue ?? 0;
  const startInvested = start?.investedAmount ?? 0;
  const startPnl = start?.pnlAmount ?? 0;

  const moneyInvested = end.investedAmount - startInvested;
  const marketGain = end.pnlAmount - startPnl;
  const base = start ? startValue + moneyInvested / 2 : moneyInvested;

  const monthly = buildMonthlyPerformance(history).filter(
    (entry) => entry.month >= period.start && entry.month <= period.end,
  );

  return {
    period,
    startDate: start?.snapshotDate ?? null,
    endDate: end.snapshotDate,
    startValue,
    startInvested,
    moneyInvested,
    marketGain,
    endValue: end.currentValue,
    periodReturn: base > 0 ? (marketGain / base) * 100 : null,
    endInvested: end.investedAmount,
    endPnl: end.pnlAmount,
    returnOnInvested: end.investedAmount > 0 ? (end.pnlAmount / end.investedAmount) * 100 : null,
    isPartial: end.snapshotDate < `${period.end}-${MONTH_END_FROM_DAY}`,
    valueSeries: start ? [start, ...inside] : inside,
    monthly,
  };
}
