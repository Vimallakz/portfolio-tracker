import { describe, expect, it } from "vitest";

import type { SnapshotHoldingRow, SnapshotRow } from "@/lib/portfolio/analytics/dashboard";
import { buildReportMovers } from "@/lib/portfolio/reports/movers";
import type { ReportPeriod } from "@/lib/portfolio/reports/period";

const holding = (
  ticker: string,
  quantity: number,
  averageBuyPrice: number,
  currentPrice: number,
  extra: Partial<SnapshotHoldingRow> = {},
): SnapshotHoldingRow => {
  const invested = quantity * averageBuyPrice;
  const value = quantity * currentPrice;

  return {
    securityId: ticker,
    name: `${ticker} Inc`,
    ticker,
    type: "STOCK",
    quantity: String(quantity),
    averageBuyPrice: String(averageBuyPrice),
    investedAmount: String(invested),
    currentPrice: String(currentPrice),
    currentValue: String(value),
    weight: "0",
    pnlAmount: String(value - invested),
    pnlPercentage: String(((value - invested) / invested) * 100),
    ...extra,
  };
};

const snapshot = (snapshotDate: string, holdings: SnapshotHoldingRow[]): SnapshotRow => ({
  id: snapshotDate,
  snapshotDate,
  holdings,
});

const september: ReportPeriod = { type: "month", start: "2026-09", end: "2026-09", label: "September 2026" };

describe("buildReportMovers", () => {
  it("ranks gainers and losers by their move over the period", () => {
    const { gainers, losers } = buildReportMovers(
      [
        snapshot("2026-08-30", [holding("AAA", 10, 10, 10), holding("BBB", 10, 10, 10), holding("CCC", 10, 10, 10)]),
        snapshot("2026-09-30", [holding("AAA", 10, 10, 12), holding("BBB", 10, 10, 11), holding("CCC", 10, 10, 9)]),
      ],
      september,
    );

    expect(gainers.map((mover) => [mover.ticker, mover.percent, mover.gain])).toEqual([
      ["AAA", 20, 20],
      ["BBB", 10, 10],
    ]);
    expect(losers.map((mover) => [mover.ticker, mover.percent, mover.gain])).toEqual([["CCC", -10, -10]]);
    expect(gainers[0].tickertapeUrl).toBe("https://www.tickertape.in/us-stocks/AAA");
  });

  it("ignores a stock split, which changes the price but not the value", () => {
    const { gainers, losers } = buildReportMovers(
      [
        snapshot("2026-08-30", [holding("DXJ", 1, 150, 180)]),
        snapshot("2026-09-30", [holding("DXJ", 3, 50, 61)]),
      ],
      september,
    );

    expect(losers).toEqual([]);
    expect(gainers[0].gain).toBeCloseTo(3);
    expect(gainers[0].percent).toBeCloseTo((3 / 180) * 100);
  });

  it("does not count new money as a gain", () => {
    const { gainers } = buildReportMovers(
      [
        snapshot("2026-08-30", [holding("AAA", 10, 10, 10)]),
        snapshot("2026-09-30", [holding("AAA", 20, 10.5, 11)]),
      ],
      september,
    );

    // Value 100 at the start plus 110 added; P&L went from 0 to 10.
    expect(gainers[0].gain).toBeCloseTo(10);
    expect(gainers[0].percent).toBeCloseTo((10 / 210) * 100);
  });

  it("measures a holding bought during the period from its buy price", () => {
    const { gainers } = buildReportMovers(
      [snapshot("2026-08-30", []), snapshot("2026-09-30", [holding("NEW", 4, 25, 30)])],
      september,
    );

    expect(gainers).toMatchObject([{ ticker: "NEW", gain: 20, percent: 20, isNew: true }]);
  });

  it("leaves out sold and unchanged holdings, and links nothing without a ticker", () => {
    const { gainers, losers } = buildReportMovers(
      [
        snapshot("2026-08-30", [holding("SOLD", 10, 10, 10), holding("FLAT", 10, 10, 10), holding("X", 1, 1, 1)]),
        snapshot("2026-09-30", [holding("FLAT", 10, 10, 10), holding("X", 1, 1, 2, { ticker: null })]),
      ],
      september,
    );

    expect(losers).toEqual([]);
    expect(gainers).toMatchObject([{ securityId: "X", tickertapeUrl: null }]);
  });

  it("prefers Tickertape's own slug and keeps the top five", () => {
    const tickers = ["A", "B", "C", "D", "E", "F"];
    const { gainers } = buildReportMovers(
      [
        snapshot("2026-08-30", tickers.map((ticker) => holding(ticker, 1, 10, 10))),
        snapshot(
          "2026-09-30",
          tickers.map((ticker, index) => holding(ticker, 1, 10, 11 + index, ticker === "F" ? { tickertapeTicker: "FFF" } : {})),
        ),
      ],
      september,
    );

    expect(gainers.map((mover) => mover.ticker)).toEqual(["F", "E", "D", "C", "B"]);
    expect(gainers[0].tickertapeUrl).toBe("https://www.tickertape.in/us-stocks/FFF");
  });

  it("starts from zero when the period holds the first snapshot, and is empty without one", () => {
    const first = [snapshot("2026-09-30", [holding("AAA", 2, 10, 15)])];

    expect(buildReportMovers(first, september).gainers).toMatchObject([{ ticker: "AAA", percent: 50, isNew: true }]);
    expect(buildReportMovers(first, { ...september, start: "2026-10", end: "2026-10" })).toEqual({
      gainers: [],
      losers: [],
    });
  });
});
