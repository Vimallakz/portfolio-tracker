import { describe, expect, it } from "vitest";

import {
  buildDashboard,
  calculateAllocation,
  parseTypeFilter,
  rankLargestHoldings,
  rankTopPerformers,
  rankWorstPerformers,
  summarizePortfolio,
  type SnapshotHoldingRow,
  type SnapshotRow,
} from "@/lib/portfolio/analytics/dashboard";

function holding(
  securityId: string,
  type: "STOCK" | "ETF",
  invested: string,
  value: string,
  overrides: Partial<SnapshotHoldingRow> = {},
): SnapshotHoldingRow {
  const pnl = Number(value) - Number(invested);

  return {
    securityId,
    name: securityId,
    ticker: securityId,
    type,
    quantity: "10",
    averageBuyPrice: "1",
    investedAmount: invested,
    currentPrice: "1",
    currentValue: value,
    weight: "0",
    pnlAmount: String(pnl),
    pnlPercentage: String(Number(invested) === 0 ? 0 : (pnl / Number(invested)) * 100),
    ...overrides,
  };
}

const GRAB = holding("GRAB", "STOCK", "500", "700", { weight: "35" });
const NVDA = holding("NVDA", "STOCK", "1000", "800", { weight: "40" });
const VOO = holding("VOO", "ETF", "450", "500", { weight: "25" });

describe("parseTypeFilter", () => {
  it("accepts stock and ETF in any case and defaults to all", () => {
    expect(parseTypeFilter("etf")).toBe("ETF");
    expect(parseTypeFilter(["STOCK"])).toBe("STOCK");
    expect(parseTypeFilter("bonds")).toBe("ALL");
    expect(parseTypeFilter(undefined)).toBe("ALL");
  });
});

describe("summarizePortfolio", () => {
  it("totals invested, value and P&L and counts by type", () => {
    const summary = summarizePortfolio([GRAB, NVDA, VOO]);

    expect(summary).toMatchObject({
      investedAmount: 1950,
      currentValue: 2000,
      pnlAmount: 50,
      holdingCount: 3,
      stockCount: 2,
      etfCount: 1,
    });
    expect(summary.pnlPercentage).toBeCloseTo(2.5641, 4);
  });

  it("returns zeros, not NaN, for an empty selection", () => {
    expect(summarizePortfolio([])).toMatchObject({ investedAmount: 0, pnlPercentage: 0, holdingCount: 0 });
  });
});

describe("calculateAllocation", () => {
  it("splits current value between stocks and ETFs", () => {
    expect(calculateAllocation([GRAB, NVDA, VOO])).toEqual([
      { type: "STOCK", currentValue: 1500, percentage: 75, holdingCount: 2 },
      { type: "ETF", currentValue: 500, percentage: 25, holdingCount: 1 },
    ]);
  });

  it("omits types with no holdings", () => {
    expect(calculateAllocation([VOO]).map((s) => s.type)).toEqual(["ETF"]);
  });
});

describe("performers", () => {
  it("ranks only gains as top and only losses as worst", () => {
    expect(rankTopPerformers([GRAB, NVDA, VOO]).map((p) => p.securityId)).toEqual(["GRAB", "VOO"]);
    expect(rankWorstPerformers([GRAB, NVDA, VOO]).map((p) => p.securityId)).toEqual(["NVDA"]);
  });

  it("respects the limit", () => {
    expect(rankTopPerformers([GRAB, VOO], 1).map((p) => p.securityId)).toEqual(["GRAB"]);
  });

  it("orders largest holdings by weight", () => {
    expect(rankLargestHoldings([GRAB, NVDA, VOO]).map((p) => p.securityId)).toEqual(["NVDA", "GRAB", "VOO"]);
  });
});

describe("buildDashboard", () => {
  const august: SnapshotRow = {
    id: "s1",
    snapshotDate: "2026-08-31",
    holdings: [holding("GRAB", "STOCK", "500", "600", { quantity: "100" }), holding("XYZ", "STOCK", "100", "80"), VOO],
  };
  const september: SnapshotRow = {
    id: "s2",
    snapshotDate: "2026-09-30",
    holdings: [holding("GRAB", "STOCK", "600", "840", { quantity: "120" }), NVDA, VOO],
  };

  it("returns null without snapshots", () => {
    expect(buildDashboard([], "ALL")).toBeNull();
  });

  it("builds history and the change since the previous snapshot", () => {
    const data = buildDashboard([august, september], "ALL")!;

    expect(data.latestSnapshotDate).toBe("2026-09-30");
    expect(data.history).toEqual([
      { snapshotDate: "2026-08-31", investedAmount: 1050, currentValue: 1180, pnlAmount: 130 },
      { snapshotDate: "2026-09-30", investedAmount: 2050, currentValue: 2140, pnlAmount: 90 },
    ]);
    expect(data.sincePrevious).toMatchObject({
      previousSnapshotDate: "2026-08-31",
      currentValueChange: 960,
      investedAmountChange: 1000,
      pnlAmountChange: -40,
      newHoldings: 1,
      removedHoldings: 1,
      increasedHoldings: 1,
      reducedHoldings: 0,
    });
  });

  it("applies the type filter everywhere except allocation", () => {
    const data = buildDashboard([august, september], "ETF")!;

    expect(data.summary.holdingCount).toBe(1);
    expect(data.history.map((p) => p.currentValue)).toEqual([500, 500]);
    expect(data.topPerformers.map((p) => p.securityId)).toEqual(["VOO"]);
    expect(data.allocation.map((s) => s.type)).toEqual(["STOCK", "ETF"]);
  });

  it("has no previous-snapshot comparison for a single snapshot", () => {
    expect(buildDashboard([august], "ALL")!.sincePrevious).toBeNull();
  });
});
