import type { DailyClose } from "@/lib/market-data/yahoo";
import type { HistoryPoint } from "@/lib/portfolio/analytics/dashboard";
import { addMonths, type MonthlyPerformance } from "@/lib/portfolio/analytics/monthly-performance";

/** Index funds stand in for the indexes, since their adjusted closes include dividends like a real investment. */
export const BENCHMARKS = [
  { symbol: "SPY", label: "S&P 500", color: "var(--chart-2)" },
  { symbol: "QQQ", label: "Nasdaq 100", color: "var(--chart-4)" },
] as const;

export type BenchmarkSymbol = (typeof BENCHMARKS)[number]["symbol"];

export type PricePoint = DailyClose;

export type IndexMove = {
  symbol: BenchmarkSymbol;
  label: string;
  /** Trading day of the starting close: the last one of the month before the period. */
  fromDate: string;
  fromClose: number;
  /** Trading day of the ending close: the last one of the period's final month, or the latest so far. */
  toDate: string;
  toClose: number;
  /** Price change, 0–100 scale: bought once at the start, held to the end. */
  change: number;
  /** What the money at work would have made at that change. Null without a base. */
  gain: number | null;
};

export type MarketPeriod = {
  /** "YYYY-MM": the index is measured from this month's last close. */
  fromMonth: string;
  /** "YYYY-MM": to this month's last close. */
  toMonth: string;
  /** Your market return over the period (Modified Dietz), 0–100 scale. */
  yourReturn: number | null;
  /** Your market gain, excluding new money. */
  yourGain: number;
  /** Money at work: starting value plus half the money added. */
  base: number | null;
  /** Benchmarks with prices for both ends. Empty when none could be loaded. */
  indexes: IndexMove[];
  /** The final month has not ended yet, so the index runs to its latest close. */
  isMonthToDate: boolean;
};

/** Last calendar day of a "YYYY-MM" month. */
export function monthEnd(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);

  return new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
}

/** The last close on or before `date`, with its trading day. Null when prices start after it. In date order. */
export function closeOn(prices: PricePoint[], date: string): PricePoint | null {
  let low = 0;
  let high = prices.length - 1;
  let found: PricePoint | null = null;

  while (low <= high) {
    const middle = (low + high) >> 1;

    if (prices[middle].date <= date) {
      found = prices[middle];
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return found;
}

/**
 * Each benchmark's move from the last close of `fromMonth` to the last close
 * of `toMonth`, as if bought once and held. Your snapshot dates do not matter
 * here: a month is always measured from month-end to month-end.
 */
export function comparePeriod(
  period: Pick<MarketPeriod, "fromMonth" | "toMonth" | "yourReturn" | "yourGain" | "base">,
  pricesBySymbol: ReadonlyMap<string, PricePoint[]>,
): MarketPeriod {
  const indexes: IndexMove[] = [];
  let isMonthToDate = false;

  for (const benchmark of BENCHMARKS) {
    const prices = pricesBySymbol.get(benchmark.symbol) ?? [];
    const from = closeOn(prices, monthEnd(period.fromMonth));
    const to = closeOn(prices, monthEnd(period.toMonth));

    if (!from || !to || to.date <= from.date || from.date.slice(0, 7) !== period.fromMonth) {
      continue;
    }

    const change = (to.close / from.close - 1) * 100;

    // The newest close falling before the month's last day means the month is still running.
    isMonthToDate ||= prices.at(-1)!.date === to.date && to.date < monthEnd(period.toMonth);

    indexes.push({
      symbol: benchmark.symbol,
      label: benchmark.label,
      fromDate: from.date,
      fromClose: from.close,
      toDate: to.date,
      toClose: to.close,
      change,
      gain: period.base !== null ? (period.base * change) / 100 : null,
    });
  }

  return { ...period, indexes, isMonthToDate };
}

const monthOf = (isoDate: string) => isoDate.slice(0, 7);

/**
 * One comparison per measured month, newest last. The first snapshot's month
 * counts as invested at its start, so it runs from the month before.
 */
export function compareMonths(months: MonthlyPerformance[], pricesBySymbol: ReadonlyMap<string, PricePoint[]>): MarketPeriod[] {
  return months
    .filter((entry) => entry.gain !== null && (entry.isBaseline || entry.fromDate))
    .map((entry) =>
      comparePeriod(
        {
          fromMonth: entry.fromDate ? monthOf(entry.fromDate) : addMonths(entry.month, -1),
          toMonth: entry.month,
          yourReturn: entry.returnPercentage,
          yourGain: entry.gain!,
          base: entry.base,
        },
        pricesBySymbol,
      ),
    );
}

export type YourPeriodReturn = Pick<MarketPeriod, "fromMonth" | "toMonth" | "yourReturn" | "yourGain" | "base">;

/**
 * Your market return from zero, measured like a report over the same range:
 * the first snapshot's money counts as invested at the start of its month and
 * later money from mid-period. Null without a snapshot.
 */
export function sinceStartReturn(history: HistoryPoint[]): YourPeriodReturn | null {
  const first = history[0];
  const last = history.at(-1);

  if (!first || !last) {
    return null;
  }

  const yourGain = last.pnlAmount;
  const base = first.investedAmount + (last.investedAmount - first.investedAmount) / 2;

  return {
    fromMonth: addMonths(monthOf(first.snapshotDate), -1),
    toMonth: monthOf(last.snapshotDate),
    yourReturn: base > 0 ? (yourGain / base) * 100 : null,
    yourGain,
    base: base > 0 ? base : null,
  };
}

/** {@link sinceStartReturn} against each index from the month-end before the first snapshot to the latest month-end. */
export function compareSinceStart(
  history: HistoryPoint[],
  pricesBySymbol: ReadonlyMap<string, PricePoint[]>,
): MarketPeriod | null {
  const yours = sinceStartReturn(history);

  return yours ? comparePeriod(yours, pricesBySymbol) : null;
}
