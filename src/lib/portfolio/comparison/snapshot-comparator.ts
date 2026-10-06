import Decimal from "decimal.js";

import { calculateChange } from "@/lib/portfolio/analytics/calculations";

/**
 * Minimal shape needed to compare two snapshots. `key` identifies the same
 * security across both sides (its id, or a provisional key for a security that
 * does not exist yet). Values are decimal strings.
 */
export type ComparableHolding = {
  key: string;
  name: string;
  quantity: string;
  averageBuyPrice: string;
  investedAmount: string;
  currentValue: string;
  weight: string;
  pnlAmount: string;
  pnlPercentage: string;
};

export type HoldingChangeStatus = "NEW" | "REMOVED" | "INCREASED" | "REDUCED" | "UNCHANGED";

const METRICS = [
  "quantity",
  "averageBuyPrice",
  "investedAmount",
  "currentValue",
  "weight",
  "pnlAmount",
  "pnlPercentage",
] as const;

type Metric = (typeof METRICS)[number];

export type HoldingComparison = {
  key: string;
  name: string;
  status: HoldingChangeStatus;
  previous: Pick<ComparableHolding, Metric> | null;
  next: Pick<ComparableHolding, Metric> | null;
  /** next − previous. Null for NEW and REMOVED, where there is no counterpart. */
  changes: Record<Metric, string> | null;
};

export type ComparisonSummary = {
  totalHoldings: number;
  existing: number;
  new: number;
  removed: number;
  increased: number;
  reduced: number;
  unchanged: number;
};

export type SnapshotComparison = {
  holdings: HoldingComparison[];
  summary: ComparisonSummary;
};

function pickMetrics(holding: ComparableHolding): Pick<ComparableHolding, Metric> {
  return Object.fromEntries(METRICS.map((m) => [m, holding[m]])) as Pick<ComparableHolding, Metric>;
}

function diff(previous: ComparableHolding, next: ComparableHolding): Record<Metric, string> {
  return Object.fromEntries(
    METRICS.map((m) => [m, calculateChange(previous[m], next[m]).toFixed()]),
  ) as Record<Metric, string>;
}

const STATUS_ORDER: Record<HoldingChangeStatus, number> = {
  NEW: 0,
  INCREASED: 1,
  REDUCED: 2,
  UNCHANGED: 3,
  REMOVED: 4,
};

/**
 * Previous snapshot vs next. With no previous snapshot (the first import),
 * every holding is NEW.
 */
export function compareSnapshots(
  previous: ComparableHolding[] | null,
  next: ComparableHolding[],
): SnapshotComparison {
  const previousByKey = new Map((previous ?? []).map((h) => [h.key, h]));
  const nextKeys = new Set(next.map((h) => h.key));

  const holdings: HoldingComparison[] = next.map((holding) => {
    const before = previousByKey.get(holding.key);

    if (!before) {
      return { key: holding.key, name: holding.name, status: "NEW", previous: null, next: pickMetrics(holding), changes: null };
    }

    const quantityChange = new Decimal(holding.quantity).cmp(before.quantity);
    const status: HoldingChangeStatus =
      quantityChange > 0 ? "INCREASED" : quantityChange < 0 ? "REDUCED" : "UNCHANGED";

    return {
      key: holding.key,
      name: holding.name,
      status,
      previous: pickMetrics(before),
      next: pickMetrics(holding),
      changes: diff(before, holding),
    };
  });

  for (const before of previous ?? []) {
    if (!nextKeys.has(before.key)) {
      holdings.push({ key: before.key, name: before.name, status: "REMOVED", previous: pickMetrics(before), next: null, changes: null });
    }
  }

  holdings.sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name),
  );

  const count = (status: HoldingChangeStatus) => holdings.filter((h) => h.status === status).length;
  const added = count("NEW");

  return {
    holdings,
    summary: {
      totalHoldings: next.length,
      existing: next.length - added,
      new: added,
      removed: count("REMOVED"),
      increased: count("INCREASED"),
      reduced: count("REDUCED"),
      unchanged: count("UNCHANGED"),
    },
  };
}
