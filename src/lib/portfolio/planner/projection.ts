export const STEP_UP_INTERVALS = [3, 6, 12] as const;
export type StepUpInterval = (typeof STEP_UP_INTERVALS)[number];

export type StepUp = {
  everyMonths: StepUpInterval;
  kind: "percent" | "amount";
  /** Percentage (0–100 scale) or amount added to the monthly investment at each step. */
  value: number;
};

export type ProjectionInput = {
  /** Portfolio value today. */
  startValue: number;
  /** Money invested so far (cost basis). */
  startInvested: number;
  monthlyContribution: number;
  /** Expected return per month, 0–100 scale. */
  monthlyReturn: number;
  months: number;
  stepUp: StepUp | null;
};

export type ProjectionPoint = {
  /** Months from today; 0 is today. */
  month: number;
  invested: number;
  value: number;
  /** Monthly investment in effect during this month. */
  contribution: number;
};

export type Projection = {
  points: ProjectionPoint[];
  finalValue: number;
  finalInvested: number;
  /** New money put in over the projection. */
  totalContributed: number;
  /** finalValue minus today's value and the new money: what the market adds. */
  projectedGain: number;
};

/**
 * Month-by-month growth: the portfolio earns the monthly return, then the
 * month's investment is added at month-end. A step-up raises the monthly
 * investment after every `everyMonths` months.
 */
export function projectInvestment(input: ProjectionInput): Projection {
  const rate = input.monthlyReturn / 100;
  const months = Math.max(0, Math.floor(input.months));

  let value = input.startValue;
  let invested = input.startInvested;
  let contribution = input.monthlyContribution;

  const points: ProjectionPoint[] = [{ month: 0, invested, value, contribution }];

  for (let month = 1; month <= months; month++) {
    if (input.stepUp && month > 1 && (month - 1) % input.stepUp.everyMonths === 0) {
      contribution =
        input.stepUp.kind === "percent"
          ? contribution * (1 + input.stepUp.value / 100)
          : contribution + input.stepUp.value;
    }

    value = value * (1 + rate) + contribution;
    invested += contribution;
    points.push({ month, invested, value, contribution });
  }

  const totalContributed = invested - input.startInvested;

  return {
    points,
    finalValue: value,
    finalInvested: invested,
    totalContributed,
    projectedGain: value - input.startValue - totalContributed,
  };
}
