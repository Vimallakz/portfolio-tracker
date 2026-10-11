import { describe, expect, it } from "vitest";

import type { HistoryPoint } from "@/lib/portfolio/analytics/dashboard";
import { buildCashFlows, calculateMoneyWeightedReturn, xirr } from "@/lib/portfolio/analytics/xirr";

const point = (snapshotDate: string, investedAmount: number, currentValue: number): HistoryPoint => ({
  snapshotDate,
  investedAmount,
  currentValue,
  pnlAmount: currentValue - investedAmount,
});

describe("xirr", () => {
  it("returns the simple yearly rate for one deposit held a year", () => {
    const rate = xirr([
      { date: "2025-01-01", amount: -1000 },
      { date: "2026-01-01", amount: 1100 },
    ]);

    expect(rate).toBeCloseTo(0.1, 6);
  });

  it("weights money by how long it was invested", () => {
    // 1000 for 365 days and 1000 for the last 183, both growing at 10% a year.
    const rate = xirr([
      { date: "2025-01-01", amount: -1000 },
      { date: "2025-07-02", amount: -1000 },
      { date: "2026-01-01", amount: 1000 * 1.1 + 1000 * 1.1 ** (183 / 365) },
    ]);

    expect(rate).toBeCloseTo(0.1, 6);
  });

  it("solves losses and very short, strongly annualized spans", () => {
    expect(xirr([{ date: "2025-01-01", amount: -1000 }, { date: "2026-01-01", amount: 800 }])).toBeCloseTo(-0.2, 6);
    expect(xirr([{ date: "2025-01-01", amount: -1000 }, { date: "2025-01-11", amount: 1100 }])).toBeGreaterThan(30);
  });

  it("has no answer without money both going in and coming back, or without a span", () => {
    expect(xirr([{ date: "2025-01-01", amount: -1000 }, { date: "2026-01-01", amount: -10 }])).toBeNull();
    expect(xirr([{ date: "2025-01-01", amount: -1000 }, { date: "2025-01-01", amount: 1100 }])).toBeNull();
    expect(xirr([])).toBeNull();
  });
});

describe("buildCashFlows", () => {
  it("invests the first amount at the start of its month and each later change at the previous snapshot", () => {
    expect(
      buildCashFlows([point("2025-01-31", 900, 1000), point("2025-02-28", 1400, 1550), point("2025-03-31", 1300, 1500)]),
    ).toEqual([
      { date: "2025-01-01", amount: -900 },
      { date: "2025-01-31", amount: -500 },
      { date: "2025-02-28", amount: 100 },
      { date: "2025-03-31", amount: 1500 },
    ]);
  });
});

describe("calculateMoneyWeightedReturn", () => {
  it("reports the yearly rate and the matching return over the span", () => {
    const result = calculateMoneyWeightedReturn([point("2025-01-01", 1000, 1000), point("2026-01-01", 1000, 1210)]);

    expect(result?.annualReturn).toBeCloseTo(21, 4);
    expect(result?.periodReturn).toBeCloseTo(21, 4);
    expect(result?.coversAYear).toBe(true);
  });

  it("flags spans under a year, where the yearly rate is magnified", () => {
    const result = calculateMoneyWeightedReturn([point("2025-01-01", 1000, 1000), point("2025-07-02", 1000, 1050)]);

    expect(result?.periodReturn).toBeCloseTo(5, 4);
    expect(result?.annualReturn).toBeGreaterThan(10);
    expect(result?.coversAYear).toBe(false);
  });

  it("measures a single snapshot from the start of its month", () => {
    const result = calculateMoneyWeightedReturn([point("2025-01-31", 1000, 1100)]);

    expect(result?.periodReturn).toBeCloseTo(10, 4);
    expect(result?.startDate).toBe("2025-01-01");
  });

  it("is null without snapshots", () => {
    expect(calculateMoneyWeightedReturn([])).toBeNull();
  });
});
