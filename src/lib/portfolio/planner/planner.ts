import type { HistoryPoint } from "@/lib/portfolio/analytics/dashboard";
import { buildMonthlyPerformance } from "@/lib/portfolio/analytics/monthly-performance";
import {
  averageContribution,
  buildMonthlyContributions,
  type ContributionAverage,
  type MonthlyContribution,
} from "@/lib/portfolio/planner/contributions";
import { summarizeEarnings, type EarningsSummary } from "@/lib/portfolio/planner/earnings";

/** Below this many measured months, averages swing too much to plan on. */
export const RELIABLE_HISTORY_MONTHS = 3;

export type PlannerData = {
  latest: HistoryPoint;
  contributions: MonthlyContribution[];
  lastContribution: MonthlyContribution | null;
  sixMonthContribution: ContributionAverage;
  twelveMonthContribution: ContributionAverage;
  earnings: {
    lastMonth: EarningsSummary | null;
    sixMonths: EarningsSummary | null;
    oneYear: EarningsSummary | null;
    allTime: EarningsSummary | null;
  };
};

/** Everything the planner shows, from whole-portfolio history (never type-filtered). */
export function buildPlanner(history: HistoryPoint[]): PlannerData | null {
  const latest = history.at(-1);

  if (!latest) {
    return null;
  }

  const contributions = buildMonthlyContributions(history);
  const performance = buildMonthlyPerformance(history);
  const last = contributions.at(-1)!;

  return {
    latest,
    contributions,
    lastContribution: last,
    sixMonthContribution: averageContribution(contributions, 6),
    twelveMonthContribution: averageContribution(contributions, 12),
    earnings: {
      lastMonth: summarizeEarnings(performance, 1),
      sixMonths: summarizeEarnings(performance, 6),
      oneYear: summarizeEarnings(performance, 12),
      allTime: summarizeEarnings(performance, null),
    },
  };
}
