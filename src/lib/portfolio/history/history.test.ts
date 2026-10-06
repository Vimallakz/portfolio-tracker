import { describe, expect, it } from "vitest";

import type { SnapshotHoldingRow } from "@/lib/portfolio/analytics/dashboard";
import {
  buildHistoryEntries,
  diffSnapshots,
  resolveComparisonPair,
  type HistorySnapshot,
} from "@/lib/portfolio/history/history";

function holding(securityId: string, quantity: string, invested: string, value: string): SnapshotHoldingRow {
  return {
    securityId,
    name: `${securityId} Inc`,
    ticker: securityId,
    type: "STOCK",
    quantity,
    averageBuyPrice: "1",
    investedAmount: invested,
    currentPrice: "1",
    currentValue: value,
    weight: "0",
    pnlAmount: String(Number(value) - Number(invested)),
    pnlPercentage: "0",
  };
}

const july: HistorySnapshot = {
  id: "s1",
  snapshotDate: "2026-07-12",
  fileName: "july.csv",
  holdings: [holding("GRAB", "10", "100", "120"), holding("EXFY", "5", "50", "40")],
};

const october: HistorySnapshot = {
  id: "s2",
  snapshotDate: "2026-10-06",
  fileName: "october.csv",
  holdings: [holding("GRAB", "19", "190", "180"), holding("VOO", "1", "500", "520")],
};

describe("buildHistoryEntries", () => {
  it("lists newest first, with changes against the previous snapshot", () => {
    const [latest, first] = buildHistoryEntries([july, october]);

    expect(latest).toMatchObject({
      id: "s2",
      fileName: "october.csv",
      totals: { investedAmount: 690, currentValue: 700, pnlAmount: 10, holdingCount: 2 },
      changes: { new: 1, removed: 1, increased: 1, reduced: 0 },
      valueChange: 540,
    });
    expect(first).toMatchObject({ id: "s1", changes: null, valueChange: null });
  });

  it("returns nothing without snapshots", () => {
    expect(buildHistoryEntries([])).toEqual([]);
  });
});

describe("diffSnapshots", () => {
  it("labels holdings and keeps security details for removed ones", () => {
    const diff = diffSnapshots(july, october);

    expect(diff.before?.currentValue).toBe(160);
    expect(diff.after.currentValue).toBe(700);
    expect(diff.holdings.map((h) => [h.securityId, h.status, h.ticker])).toEqual([
      ["VOO", "NEW", "VOO"],
      ["GRAB", "INCREASED", "GRAB"],
      ["EXFY", "REMOVED", "EXFY"],
    ]);
  });

  it("treats every holding as new for the first snapshot", () => {
    const diff = diffSnapshots(null, july);

    expect(diff.before).toBeNull();
    expect(diff.summary.new).toBe(2);
  });
});

describe("resolveComparisonPair", () => {
  const snapshots = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("defaults to the latest two", () => {
    expect(resolveComparisonPair(snapshots, undefined, undefined)).toEqual({ from: { id: "b" }, to: { id: "c" } });
  });

  it("orders a reversed pick oldest first", () => {
    expect(resolveComparisonPair(snapshots, "c", "a")).toEqual({ from: { id: "a" }, to: { id: "c" } });
  });

  it("falls back for unknown ids and picks the snapshot before `to`", () => {
    expect(resolveComparisonPair(snapshots, "zzz", "b")).toEqual({ from: { id: "a" }, to: { id: "b" } });
    expect(resolveComparisonPair(snapshots, undefined, "a")).toEqual({ from: { id: "a" }, to: { id: "b" } });
  });

  it("needs two snapshots", () => {
    expect(resolveComparisonPair([{ id: "a" }], undefined, undefined)).toBeNull();
  });
});
