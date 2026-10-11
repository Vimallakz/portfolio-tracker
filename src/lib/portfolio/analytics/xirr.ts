import type { HistoryPoint } from "@/lib/portfolio/analytics/dashboard";

/** A dated cash flow seen from the investor: negative when money goes in, positive when it comes back. */
export type CashFlow = {
  /** "YYYY-MM-DD". */
  date: string;
  amount: number;
};

export type MoneyWeightedReturn = {
  /** XIRR: the yearly rate that makes the cash flows add up, 0–100 scale. */
  annualReturn: number;
  /** The same rate over the measured span only, 0–100 scale. */
  periodReturn: number;
  startDate: string;
  endDate: string;
  days: number;
  /** Under a year, annualizing magnifies a few good or bad weeks, so show the period return instead. */
  coversAYear: boolean;
};

const DAY_MS = 86_400_000;
const DAYS_PER_YEAR = 365;

const daysBetween = (from: string, to: string) =>
  (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS;

/** The day halfway between two "YYYY-MM-DD" dates, rounded down. */
export function midpointDate(from: string, to: string): string {
  const start = Date.parse(`${from}T00:00:00Z`);
  const days = Math.floor(daysBetween(from, to) / 2);

  return new Date(start + days * DAY_MS).toISOString().slice(0, 10);
}

function netPresentValue(rate: number, flows: CashFlow[], start: string): number {
  return flows.reduce(
    (total, flow) => total + flow.amount / (1 + rate) ** (daysBetween(start, flow.date) / DAYS_PER_YEAR),
    0,
  );
}

/**
 * The annual rate (as a fraction) at which the flows' present value is zero,
 * or null when there is no such rate: fewer than two dates, or money only
 * going one way. Solved by bisection, which always converges on a bracketed
 * root, unlike Newton's method on short or lumpy histories.
 */
export function xirr(flows: CashFlow[]): number | null {
  const sorted = [...flows].sort((a, b) => a.date.localeCompare(b.date));
  const start = sorted[0]?.date;
  const end = sorted.at(-1)?.date;

  if (!start || !end || daysBetween(start, end) <= 0) {
    return null;
  }
  if (!sorted.some((flow) => flow.amount < 0) || !sorted.some((flow) => flow.amount > 0)) {
    return null;
  }

  let low = -0.9999;
  let high = 1;
  const valueAtLow = netPresentValue(low, sorted, start);

  // Short spans annualize to very large rates, so widen the bracket until the sign flips.
  while (Math.sign(netPresentValue(high, sorted, start)) === Math.sign(valueAtLow)) {
    high *= 10;
    if (high > 1e9) {
      return null;
    }
  }

  for (let step = 0; step < 200; step++) {
    const middle = (low + high) / 2;
    const value = netPresentValue(middle, sorted, start);

    if (Math.abs(value) < 1e-9 || high - low < 1e-12) {
      return middle;
    }
    if (Math.sign(value) === Math.sign(valueAtLow)) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return (low + high) / 2;
}

/**
 * Cash flows for the money-weighted return from the first point to the last.
 * The first point's value is treated as invested on its date, so returns earned
 * before it are not counted. Each later change in invested amount is the money
 * added (or withdrawn) midway between that snapshot and the previous one, since
 * snapshots do not say which day it really moved. This matches the Modified
 * Dietz returns elsewhere. The last value comes back at the end.
 */
export function buildCashFlows(points: HistoryPoint[]): CashFlow[] {
  const first = points[0];
  const last = points.at(-1);

  if (!first || !last) {
    return [];
  }

  const flows: CashFlow[] = [{ date: first.snapshotDate, amount: -first.currentValue }];

  for (let index = 1; index < points.length; index++) {
    const added = points[index].investedAmount - points[index - 1].investedAmount;

    if (added !== 0) {
      flows.push({ date: midpointDate(points[index - 1].snapshotDate, points[index].snapshotDate), amount: -added });
    }
  }

  flows.push({ date: last.snapshotDate, amount: last.currentValue });

  return flows;
}

/** XIRR of `flows`, with the matching return over their span. Null when it cannot be solved. */
export function moneyWeightedReturnOf(flows: CashFlow[]): MoneyWeightedReturn | null {
  const rate = xirr(flows);

  if (rate === null) {
    return null;
  }

  const dates = flows.map((flow) => flow.date).sort();
  const startDate = dates[0];
  const endDate = dates.at(-1)!;
  const days = daysBetween(startDate, endDate);

  return {
    annualReturn: rate * 100,
    periodReturn: ((1 + rate) ** (days / DAYS_PER_YEAR) - 1) * 100,
    startDate,
    endDate,
    days,
    coversAYear: days >= DAYS_PER_YEAR,
  };
}

/** Whole months the return spans, at least one. */
export const monthsSpanned = (result: MoneyWeightedReturn) => Math.max(1, Math.round(result.days / 30.44));

/** Money-weighted return of the portfolio across `points` (see buildCashFlows). */
export const calculateMoneyWeightedReturn = (points: HistoryPoint[]) =>
  moneyWeightedReturnOf(buildCashFlows(points));
