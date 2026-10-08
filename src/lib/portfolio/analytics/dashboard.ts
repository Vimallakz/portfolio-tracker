import Decimal from "decimal.js";

import type { SecurityType } from "@/generated/prisma/enums";
import {
  calculateChange,
  calculatePnl,
  calculatePnlPercentage,
  sumDecimals,
} from "@/lib/portfolio/analytics/calculations";
import { compareSnapshots, type ComparableHolding } from "@/lib/portfolio/comparison/snapshot-comparator";

/** A snapshot holding as read from the database, decimals as strings. */
export type SnapshotHoldingRow = {
  securityId: string;
  name: string;
  ticker: string | null;
  type: SecurityType;
  quantity: string;
  averageBuyPrice: string;
  investedAmount: string;
  currentPrice: string;
  currentValue: string;
  weight: string;
  pnlAmount: string;
  pnlPercentage: string;
};

export type SnapshotRow = {
  id: string;
  snapshotDate: string;
  holdings: SnapshotHoldingRow[];
};

export type TypeFilter = "ALL" | SecurityType;

export const TYPE_FILTERS: readonly TypeFilter[] = ["ALL", "STOCK", "ETF"];

export function parseTypeFilter(value: string | string[] | undefined): TypeFilter {
  const normalized = (Array.isArray(value) ? value[0] : value)?.toUpperCase();

  return normalized === "STOCK" || normalized === "ETF" ? normalized : "ALL";
}

/** Display values. Converted to numbers only after all arithmetic is done. */
export type PortfolioSummary = {
  investedAmount: number;
  currentValue: number;
  pnlAmount: number;
  pnlPercentage: number;
  holdingCount: number;
  stockCount: number;
  etfCount: number;
};

export type AllocationSlice = {
  type: SecurityType;
  currentValue: number;
  percentage: number;
  holdingCount: number;
};

export type HoldingPerformance = {
  securityId: string;
  name: string;
  ticker: string | null;
  type: SecurityType;
  currentValue: number;
  pnlAmount: number;
  pnlPercentage: number;
  weight: number;
};

export type HistoryPoint = {
  snapshotDate: string;
  investedAmount: number;
  currentValue: number;
  pnlAmount: number;
};

export type SincePrevious = {
  previousSnapshotDate: string;
  currentSnapshotDate: string;
  previousValue: number;
  currentValue: number;
  /** Includes new money, so it is not a return. */
  currentValueChange: number;
  /** Net money added (negative when withdrawn). */
  investedAmountChange: number;
  previousPnlAmount: number;
  currentPnlAmount: number;
  /** Market gain or loss: the change in P&L, which excludes new money. */
  pnlAmountChange: number;
  /** pnlAmountChange over the previous value plus half the money added (Modified Dietz), 0–100 scale. Null without a base. */
  marketReturnPercentage: number | null;
  newHoldings: number;
  removedHoldings: number;
  increasedHoldings: number;
  reducedHoldings: number;
};

export type DashboardData = {
  latestSnapshotDate: string;
  snapshotCount: number;
  summary: PortfolioSummary;
  /** Always the whole portfolio, regardless of the type filter. */
  allocation: AllocationSlice[];
  topPerformers: HoldingPerformance[];
  worstPerformers: HoldingPerformance[];
  largestHoldings: HoldingPerformance[];
  history: HistoryPoint[];
  sincePrevious: SincePrevious | null;
};

const PERFORMER_LIMIT = 5;
const LARGEST_HOLDINGS_LIMIT = 10;

const toNumber = (value: Decimal) => value.toNumber();

export function totalsOf(holdings: SnapshotHoldingRow[]) {
  const investedAmount = sumDecimals(holdings.map((h) => h.investedAmount));
  const currentValue = sumDecimals(holdings.map((h) => h.currentValue));

  return {
    investedAmount,
    currentValue,
    pnlAmount: calculatePnl(currentValue, investedAmount),
    pnlPercentage: calculatePnlPercentage(currentValue, investedAmount),
  };
}

export function summarizePortfolio(holdings: SnapshotHoldingRow[]): PortfolioSummary {
  const totals = totalsOf(holdings);

  return {
    investedAmount: toNumber(totals.investedAmount),
    currentValue: toNumber(totals.currentValue),
    pnlAmount: toNumber(totals.pnlAmount),
    pnlPercentage: toNumber(totals.pnlPercentage),
    holdingCount: holdings.length,
    stockCount: holdings.filter((h) => h.type === "STOCK").length,
    etfCount: holdings.filter((h) => h.type === "ETF").length,
  };
}

/** Split of current value by security type. Types with no holdings are omitted. */
export function calculateAllocation(holdings: SnapshotHoldingRow[]): AllocationSlice[] {
  const total = sumDecimals(holdings.map((h) => h.currentValue));

  return (["STOCK", "ETF"] as const)
    .map((type) => {
      const ofType = holdings.filter((h) => h.type === type);
      const value = sumDecimals(ofType.map((h) => h.currentValue));

      return {
        type,
        currentValue: toNumber(value),
        percentage: total.isZero() ? 0 : toNumber(value.div(total).mul(100)),
        holdingCount: ofType.length,
      };
    })
    .filter((slice) => slice.holdingCount > 0);
}

function toPerformance(h: SnapshotHoldingRow): HoldingPerformance {
  return {
    securityId: h.securityId,
    name: h.name,
    ticker: h.ticker,
    type: h.type,
    currentValue: Number(h.currentValue),
    pnlAmount: Number(h.pnlAmount),
    pnlPercentage: Number(h.pnlPercentage),
    weight: Number(h.weight),
  };
}

const byPnlPercentage = (a: SnapshotHoldingRow, b: SnapshotHoldingRow) =>
  new Decimal(a.pnlPercentage).cmp(b.pnlPercentage);

/** Holdings in profit, best first. A loss never appears as a "top performer". */
export function rankTopPerformers(holdings: SnapshotHoldingRow[], limit = PERFORMER_LIMIT): HoldingPerformance[] {
  return holdings
    .filter((h) => new Decimal(h.pnlPercentage).gt(0))
    .sort((a, b) => byPnlPercentage(b, a))
    .slice(0, limit)
    .map(toPerformance);
}

/** Holdings at a loss, worst first. */
export function rankWorstPerformers(holdings: SnapshotHoldingRow[], limit = PERFORMER_LIMIT): HoldingPerformance[] {
  return holdings
    .filter((h) => new Decimal(h.pnlPercentage).lt(0))
    .sort(byPnlPercentage)
    .slice(0, limit)
    .map(toPerformance);
}

export function rankLargestHoldings(holdings: SnapshotHoldingRow[], limit = LARGEST_HOLDINGS_LIMIT): HoldingPerformance[] {
  return [...holdings]
    .sort((a, b) => new Decimal(b.weight).cmp(a.weight))
    .slice(0, limit)
    .map(toPerformance);
}

export function buildHistory(snapshots: SnapshotRow[]): HistoryPoint[] {
  return snapshots.map((snapshot) => {
    const totals = totalsOf(snapshot.holdings);

    return {
      snapshotDate: snapshot.snapshotDate,
      investedAmount: toNumber(totals.investedAmount),
      currentValue: toNumber(totals.currentValue),
      pnlAmount: toNumber(totals.pnlAmount),
    };
  });
}

export const toComparable = (h: SnapshotHoldingRow): ComparableHolding => ({
  key: h.securityId,
  name: h.name,
  quantity: h.quantity,
  averageBuyPrice: h.averageBuyPrice,
  investedAmount: h.investedAmount,
  currentValue: h.currentValue,
  weight: h.weight,
  pnlAmount: h.pnlAmount,
  pnlPercentage: h.pnlPercentage,
});

export function calculateSincePrevious(previous: SnapshotRow, latest: SnapshotRow): SincePrevious {
  const before = totalsOf(previous.holdings);
  const after = totalsOf(latest.holdings);
  const { summary } = compareSnapshots(previous.holdings.map(toComparable), latest.holdings.map(toComparable));
  const investedChange = calculateChange(before.investedAmount, after.investedAmount);
  const pnlChange = calculateChange(before.pnlAmount, after.pnlAmount);
  const base = before.currentValue.add(investedChange.div(2));

  return {
    previousSnapshotDate: previous.snapshotDate,
    currentSnapshotDate: latest.snapshotDate,
    previousValue: toNumber(before.currentValue),
    currentValue: toNumber(after.currentValue),
    currentValueChange: toNumber(calculateChange(before.currentValue, after.currentValue)),
    investedAmountChange: toNumber(investedChange),
    previousPnlAmount: toNumber(before.pnlAmount),
    currentPnlAmount: toNumber(after.pnlAmount),
    pnlAmountChange: toNumber(pnlChange),
    marketReturnPercentage: base.greaterThan(0) ? toNumber(pnlChange.div(base).mul(100)) : null,
    newHoldings: summary.new,
    removedHoldings: summary.removed,
    increasedHoldings: summary.increased,
    reducedHoldings: summary.reduced,
  };
}

/**
 * Everything the dashboard renders, from a profile's snapshots in date order.
 * The type filter narrows every figure except allocation, which by definition
 * describes the whole portfolio. Returns null when there are no snapshots.
 */
export function buildDashboard(snapshots: SnapshotRow[], filter: TypeFilter): DashboardData | null {
  const latest = snapshots.at(-1);

  if (!latest) {
    return null;
  }

  const narrow = (snapshot: SnapshotRow): SnapshotRow =>
    filter === "ALL" ? snapshot : { ...snapshot, holdings: snapshot.holdings.filter((h) => h.type === filter) };

  const filtered = snapshots.map(narrow);
  const latestFiltered = filtered.at(-1)!;
  const previousFiltered = filtered.at(-2);

  return {
    latestSnapshotDate: latest.snapshotDate,
    snapshotCount: snapshots.length,
    summary: summarizePortfolio(latestFiltered.holdings),
    allocation: calculateAllocation(latest.holdings),
    topPerformers: rankTopPerformers(latestFiltered.holdings),
    worstPerformers: rankWorstPerformers(latestFiltered.holdings),
    largestHoldings: rankLargestHoldings(latestFiltered.holdings),
    history: buildHistory(filtered),
    sincePrevious: previousFiltered ? calculateSincePrevious(previousFiltered, latestFiltered) : null,
  };
}
