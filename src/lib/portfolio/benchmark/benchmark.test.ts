import { describe, expect, it } from "vitest";

import { parseDailyCloses } from "@/lib/market-data/yahoo";
import type { HistoryPoint } from "@/lib/portfolio/analytics/dashboard";
import { buildMonthlyPerformance } from "@/lib/portfolio/analytics/monthly-performance";
import { closeOn, compareMonths, comparePeriod, compareSinceStart, monthEnd } from "@/lib/portfolio/benchmark/benchmark";

const point = (snapshotDate: string, investedAmount: number, currentValue: number): HistoryPoint => ({
  snapshotDate,
  investedAmount,
  currentValue,
  pnlAmount: currentValue - investedAmount,
});

const spy = [
  { date: "2026-05-29", close: 98 },
  { date: "2026-06-29", close: 99 },
  { date: "2026-06-30", close: 100 },
  { date: "2026-07-15", close: 104 },
  { date: "2026-07-31", close: 102 },
  { date: "2026-08-28", close: 107.1 },
  { date: "2026-09-04", close: 108 },
];

describe("monthEnd", () => {
  it("handles month lengths and leap years", () => {
    expect(monthEnd("2026-06")).toBe("2026-06-30");
    expect(monthEnd("2026-08")).toBe("2026-08-31");
    expect(monthEnd("2028-02")).toBe("2028-02-29");
  });
});

describe("closeOn", () => {
  it("uses the last close on or before the date", () => {
    expect(closeOn(spy, "2026-08-31")).toEqual({ date: "2026-08-28", close: 107.1 });
    expect(closeOn(spy, "2026-01-01")).toBeNull();
  });
});

describe("comparePeriod", () => {
  it("measures each index from month-end close to month-end close, whatever the snapshot dates", () => {
    const period = comparePeriod(
      { fromMonth: "2026-06", toMonth: "2026-07", yourReturn: 3, yourGain: 15, base: 500 },
      new Map([["SPY", spy]]),
    );

    expect(period.indexes).toEqual([
      {
        symbol: "SPY",
        label: "S&P 500",
        fromDate: "2026-06-30",
        fromClose: 100,
        toDate: "2026-07-31",
        toClose: 102,
        change: expect.closeTo(2, 6),
        gain: expect.closeTo(10, 6),
      },
    ]);
    expect(period.isMonthToDate).toBe(false);
  });

  it("uses the last trading day when the month ends on a weekend", () => {
    const [move] = comparePeriod(
      { fromMonth: "2026-07", toMonth: "2026-08", yourReturn: null, yourGain: 0, base: null },
      new Map([["SPY", spy]]),
    ).indexes;

    expect(move).toMatchObject({ fromDate: "2026-07-31", toDate: "2026-08-28", gain: null });
    expect(move.change).toBeCloseTo(5, 6);
  });

  it("flags a month that has not ended yet", () => {
    const period = comparePeriod(
      { fromMonth: "2026-08", toMonth: "2026-09", yourReturn: null, yourGain: 0, base: null },
      new Map([["SPY", spy]]),
    );

    expect(period.indexes[0].toDate).toBe("2026-09-04");
    expect(period.isMonthToDate).toBe(true);
  });

  it("leaves out an index without prices for the starting month", () => {
    const period = comparePeriod(
      { fromMonth: "2026-04", toMonth: "2026-07", yourReturn: null, yourGain: 0, base: null },
      new Map([["SPY", spy]]),
    );

    expect(period.indexes).toEqual([]);
  });
});

describe("compareMonths and compareSinceStart", () => {
  const history = [point("2026-06-30", 300, 300), point("2026-07-30", 600, 615), point("2026-08-30", 900, 930)];

  it("compares every month with that month's index move, the first one from the month before", () => {
    const months = compareMonths(buildMonthlyPerformance(history), new Map([["SPY", spy]]));

    expect(months.map((month) => [month.fromMonth, month.toMonth])).toEqual([
      ["2026-05", "2026-06"],
      ["2026-06", "2026-07"],
      ["2026-07", "2026-08"],
    ]);
    // The first snapshot's money counts as invested at the start of June: 98 (May 29) to 100 (Jun 30).
    expect(months[0]).toMatchObject({ yourGain: 0, yourReturn: 0, base: 300 });
    expect(months[0].indexes[0].change).toBeCloseTo(2.0408, 4);
    expect(months[1].yourGain).toBe(15);
    expect(months[1].indexes[0].change).toBeCloseTo(2, 6);
    expect(months[2].indexes[0].change).toBeCloseTo(5, 6);
  });

  it("measures from the start of the first snapshot's month, like a report over the same range", () => {
    const period = compareSinceStart(history, new Map([["SPY", spy]]));

    // Gain 30 over 300 + 600 / 2 at work; the index from 98 (May 29) to 107.1 (Aug 28).
    expect(period).toMatchObject({ fromMonth: "2026-05", toMonth: "2026-08", yourGain: 30, base: 600 });
    expect(period?.yourReturn).toBeCloseTo(5, 6);
    expect(period?.indexes[0].change).toBeCloseTo(9.2857, 4);
    expect(period?.indexes[0].gain).toBeCloseTo(55.714, 3);
  });

  it("compares a single snapshot from the start of its month", () => {
    const period = compareSinceStart([point("2026-06-30", 300, 306)], new Map([["SPY", spy]]));

    expect(period).toMatchObject({ fromMonth: "2026-05", toMonth: "2026-06", yourGain: 6, base: 300 });
    expect(period?.yourReturn).toBeCloseTo(2, 6);
    expect(period?.indexes[0].change).toBeCloseTo(2.0408, 4);
  });
});

describe("parseDailyCloses", () => {
  it("reads adjusted closes by trading day and skips gaps", () => {
    const json = {
      chart: {
        result: [
          {
            timestamp: [1735828200, 1735914600, 1736173800],
            indicators: { adjclose: [{ adjclose: [505.1, null, 519.9] }], quote: [{ close: [510.2, 518.5, 524.5] }] },
          },
        ],
      },
    };

    expect(parseDailyCloses(json)).toEqual([
      { date: "2025-01-02", close: 505.1 },
      { date: "2025-01-06", close: 519.9 },
    ]);
  });

  it("returns nothing for errors or unexpected shapes", () => {
    expect(parseDailyCloses({ chart: { result: null, error: { code: "Not Found" } } })).toEqual([]);
    expect(parseDailyCloses("nope")).toEqual([]);
  });
});
