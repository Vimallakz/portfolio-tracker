import type { SecurityType } from "@/generated/prisma/enums";
import { calculateChange } from "@/lib/portfolio/analytics/calculations";
import { toComparable, totalsOf, type SnapshotHoldingRow, type SnapshotRow } from "@/lib/portfolio/analytics/dashboard";
import {
  compareSnapshots,
  type ComparisonSummary,
  type HoldingComparison,
} from "@/lib/portfolio/comparison/snapshot-comparator";

export type HistorySnapshot = SnapshotRow & { fileName: string | null };

export type SnapshotTotals = {
  investedAmount: number;
  currentValue: number;
  pnlAmount: number;
  pnlPercentage: number;
  holdingCount: number;
};

export type HoldingChangeCounts = Pick<ComparisonSummary, "new" | "removed" | "increased" | "reduced">;

export type HistoryEntry = {
  id: string;
  snapshotDate: string;
  fileName: string | null;
  totals: SnapshotTotals;
  /** Null for the first snapshot, which has nothing to compare against. */
  changes: HoldingChangeCounts | null;
  valueChange: number | null;
};

export type ComparedHolding = HoldingComparison & {
  securityId: string;
  ticker: string | null;
  type: SecurityType;
};

export type SnapshotDiff = {
  before: SnapshotTotals | null;
  after: SnapshotTotals;
  holdings: ComparedHolding[];
  summary: ComparisonSummary;
};

export function summarizeTotals(holdings: SnapshotHoldingRow[]): SnapshotTotals {
  const totals = totalsOf(holdings);

  return {
    investedAmount: totals.investedAmount.toNumber(),
    currentValue: totals.currentValue.toNumber(),
    pnlAmount: totals.pnlAmount.toNumber(),
    pnlPercentage: totals.pnlPercentage.toNumber(),
    holdingCount: holdings.length,
  };
}

/** `previous` null means `next` is the first snapshot, so every holding is NEW. */
export function diffSnapshots(previous: SnapshotRow | null, next: SnapshotRow): SnapshotDiff {
  const { holdings, summary } = compareSnapshots(
    previous ? previous.holdings.map(toComparable) : null,
    next.holdings.map(toComparable),
  );
  const details = new Map([...(previous?.holdings ?? []), ...next.holdings].map((h) => [h.securityId, h]));

  return {
    before: previous ? summarizeTotals(previous.holdings) : null,
    after: summarizeTotals(next.holdings),
    holdings: holdings.map((h) => {
      const detail = details.get(h.key)!;
      return { ...h, securityId: detail.securityId, ticker: detail.ticker, type: detail.type };
    }),
    summary,
  };
}

/** Snapshots in date order (oldest first) to history entries, newest first. */
export function buildHistoryEntries(snapshots: HistorySnapshot[]): HistoryEntry[] {
  return snapshots
    .map((snapshot, index) => {
      const previous = snapshots[index - 1];
      const totals = summarizeTotals(snapshot.holdings);

      if (!previous) {
        return { id: snapshot.id, snapshotDate: snapshot.snapshotDate, fileName: snapshot.fileName, totals, changes: null, valueChange: null };
      }

      const { summary } = compareSnapshots(previous.holdings.map(toComparable), snapshot.holdings.map(toComparable));
      const before = totalsOf(previous.holdings);

      return {
        id: snapshot.id,
        snapshotDate: snapshot.snapshotDate,
        fileName: snapshot.fileName,
        totals,
        changes: { new: summary.new, removed: summary.removed, increased: summary.increased, reduced: summary.reduced },
        valueChange: calculateChange(before.currentValue, totals.currentValue).toNumber(),
      };
    })
    .reverse();
}

/**
 * The two snapshots to compare, oldest first. Unknown or missing ids fall back
 * to the latest two; a pick in reverse date order is swapped.
 */
export function resolveComparisonPair<T extends { id: string }>(
  snapshots: T[],
  fromId: string | undefined,
  toId: string | undefined,
): { from: T; to: T } | null {
  if (snapshots.length < 2) {
    return null;
  }

  const indexOf = (id: string | undefined) => (id ? snapshots.findIndex((s) => s.id === id) : -1);
  let fromIndex = indexOf(fromId);
  let toIndex = indexOf(toId);

  if (toIndex === -1) toIndex = snapshots.length - 1;
  if (fromIndex === -1) fromIndex = toIndex === 0 ? 1 : toIndex - 1;
  if (fromIndex > toIndex) [fromIndex, toIndex] = [toIndex, fromIndex];

  return { from: snapshots[fromIndex], to: snapshots[toIndex] };
}
