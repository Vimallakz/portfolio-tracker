import { addMonths } from "@/lib/portfolio/analytics/monthly-performance";
import { monthOf, monthsBetween } from "@/lib/portfolio/planner/contributions";
import { projectInvestment } from "@/lib/portfolio/planner/projection";

export type InvestmentGoal = {
  name: string;
  /** USD, in today's money. */
  targetAmount: number;
  /** "YYYY-MM"; the goal is due at the end of this month. */
  targetMonth: string;
  /** Yearly inflation in %, applied to the target up to its month. Null when off. */
  inflationRate: number | null;
};

export type GoalStatus = "reached" | "ahead" | "on-track" | "behind" | "missed";

export type GoalEvaluation = {
  /** Months from the latest snapshot's month to the target month; 0 or less once it is due. */
  monthsLeft: number;
  /** The target in money of the target month: targetAmount with inflation added. */
  targetAtDate: number;
  /** Today's value against targetAtDate, 0–100. */
  progress: number;
  /** Value at the target month if the current pace holds. */
  projectedAtDate: number;
  /** projectedAtDate minus targetAtDate: positive is a surplus, negative a shortfall. */
  gap: number;
  status: GoalStatus;
  /** Monthly investment that reaches the target at the expected return. Null once the goal is due. */
  requiredMonthly: number | null;
  /** "YYYY-MM" the current pace first reaches the (inflating) target, or null if not within 50 years. */
  reachMonth: string | null;
};

/** Projected value within this share of the target counts as on track rather than ahead or behind. */
const ON_TRACK_BAND = 0.02;
const MAX_SEARCH_MONTHS = 50 * 12;

const inflate = (amount: number, inflationRate: number | null, months: number) =>
  inflationRate ? amount * (1 + inflationRate / 100) ** (Math.max(0, months) / 12) : amount;

/**
 * Monthly investment that grows startValue to target in `months` at `monthlyReturn`
 * (0–100 scale), invested at each month-end like projectInvestment. Never negative.
 */
export function requiredMonthlyContribution(
  startValue: number,
  target: number,
  months: number,
  monthlyReturn: number,
): number {
  const rate = monthlyReturn / 100;

  if (months <= 0) return 0;
  if (rate === 0) return Math.max(0, (target - startValue) / months);

  const growth = (1 + rate) ** months;
  return Math.max(0, ((target - startValue * growth) * rate) / (growth - 1));
}

/**
 * Where the goal stands at the current pace: the same monthly investment and
 * expected return the planner uses, starting from the latest snapshot.
 */
export function evaluateGoal({
  goal,
  startValue,
  startInvested,
  monthlyContribution,
  monthlyReturn,
  asOf,
}: {
  goal: InvestmentGoal;
  startValue: number;
  startInvested: number;
  monthlyContribution: number;
  /** 0–100 scale. */
  monthlyReturn: number;
  /** "YYYY-MM-DD" of the latest snapshot. */
  asOf: string;
}): GoalEvaluation {
  const startMonth = monthOf(asOf);
  const monthsLeft = monthsBetween(startMonth, goal.targetMonth);
  const targetAtDate = inflate(goal.targetAmount, goal.inflationRate, monthsLeft);

  const projectedAtDate =
    monthsLeft > 0
      ? projectInvestment({
          startValue,
          startInvested,
          monthlyContribution,
          monthlyReturn,
          months: monthsLeft,
          stepUp: null,
        }).finalValue
      : startValue;
  const gap = projectedAtDate - targetAtDate;

  let status: GoalStatus;
  if (startValue >= targetAtDate) status = "reached";
  else if (monthsLeft <= 0) status = "missed";
  else if (projectedAtDate >= targetAtDate * (1 + ON_TRACK_BAND)) status = "ahead";
  else if (projectedAtDate >= targetAtDate * (1 - ON_TRACK_BAND)) status = "on-track";
  else status = "behind";

  let reachMonth: string | null = null;
  let value = startValue;
  const rate = monthlyReturn / 100;
  for (let month = 0; month <= MAX_SEARCH_MONTHS; month++) {
    if (month > 0) value = value * (1 + rate) + monthlyContribution;
    if (value >= inflate(goal.targetAmount, goal.inflationRate, month)) {
      reachMonth = addMonths(startMonth, month);
      break;
    }
  }

  return {
    monthsLeft,
    targetAtDate,
    progress: targetAtDate > 0 ? Math.min(100, Math.max(0, (startValue / targetAtDate) * 100)) : 100,
    projectedAtDate,
    gap,
    status,
    requiredMonthly:
      monthsLeft > 0 ? requiredMonthlyContribution(startValue, targetAtDate, monthsLeft, monthlyReturn) : null,
    reachMonth,
  };
}
