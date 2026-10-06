import { describe, expect, it } from "vitest";

import {
  calculateChange,
  calculateCurrentValue,
  calculateInvestedAmount,
  calculatePnl,
  calculatePnlPercentage,
  calculatePortfolioWeight,
  sumDecimals,
} from "@/lib/portfolio/analytics/calculations";

describe("calculatePnl", () => {
  it("is current value minus invested", () => {
    expect(calculatePnl(1250, 1000).toNumber()).toBe(250);
    expect(calculatePnl("80.97", "81.76").toFixed(2)).toBe("-0.79");
  });
});

describe("calculatePnlPercentage", () => {
  it("returns the return on invested amount", () => {
    expect(calculatePnlPercentage(1250, 1000).toNumber()).toBe(25);
    expect(calculatePnlPercentage(750, 1000).toNumber()).toBe(-25);
  });

  it("returns 0 instead of NaN or Infinity when nothing is invested", () => {
    expect(calculatePnlPercentage(100, 0).toNumber()).toBe(0);
    expect(calculatePnlPercentage(0, 0).toNumber()).toBe(0);
  });
});

describe("calculatePortfolioWeight", () => {
  it("returns the share of total value", () => {
    expect(calculatePortfolioWeight(25, 100).toNumber()).toBe(25);
  });

  it("returns 0 for an empty portfolio", () => {
    expect(calculatePortfolioWeight(0, 0).toNumber()).toBe(0);
  });
});

describe("quantity × price", () => {
  it("is exact for fractional shares", () => {
    expect(calculateInvestedAmount("0.1", "0.2").toString()).toBe("0.02");
    expect(calculateCurrentValue("0.67067", "120.74").toFixed(2)).toBe("80.98");
  });
});

describe("calculateChange and sumDecimals", () => {
  it("computes deltas and totals without float drift", () => {
    expect(calculateChange(100, 120).toNumber()).toBe(20);
    expect(sumDecimals(["0.1", "0.2"]).toString()).toBe("0.3");
  });
});
