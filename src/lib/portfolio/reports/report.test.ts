import { describe, expect, it } from "vitest";

import type { HistoryPoint } from "@/lib/portfolio/analytics/dashboard";
import { listMonths, listQuarters, parseReportPeriod } from "@/lib/portfolio/reports/period";
import { buildReport } from "@/lib/portfolio/reports/report";

const point = (snapshotDate: string, investedAmount: number, currentValue: number): HistoryPoint => ({
  snapshotDate,
  investedAmount,
  currentValue,
  pnlAmount: currentValue - investedAmount,
});

const history = [
  point("2026-06-30", 312.72, 300.05),
  point("2026-07-30", 625.44, 600.09),
  point("2026-08-30", 938.16, 900.14),
  point("2026-09-30", 1289.52, 1310.51),
];

const span = { first: "2026-06", latest: "2026-09" };

describe("parseReportPeriod", () => {
  it("defaults to the latest month", () => {
    expect(parseReportPeriod({}, span)).toEqual({ type: "month", start: "2026-09", end: "2026-09", label: "September 2026" });
  });

  it("reads a month, a quarter and a range", () => {
    expect(parseReportPeriod({ type: "month", month: "2026-07" }, span)).toMatchObject({ start: "2026-07", end: "2026-07" });
    expect(parseReportPeriod({ type: "quarter", quarter: "2026-Q3" }, span)).toMatchObject({
      start: "2026-07",
      end: "2026-09",
      label: "Q3 2026 (Jul–Sep 2026)",
    });
    expect(parseReportPeriod({ type: "range", from: "2026-06", to: "2026-08" }, span)).toMatchObject({
      start: "2026-06",
      end: "2026-08",
      label: "Jun 2026 – Aug 2026",
    });
  });

  it("falls back when the request is malformed or outside the data", () => {
    expect(parseReportPeriod({ month: "2025-01" }, span).start).toBe("2026-09");
    expect(parseReportPeriod({ type: "quarter", quarter: "2026-Q9" }, span).start).toBe("2026-07");
    expect(parseReportPeriod({ type: "range", from: "nope", to: "2026-08" }, span)).toMatchObject({
      start: "2026-06",
      end: "2026-08",
    });
  });

  it("swaps a backwards range", () => {
    expect(parseReportPeriod({ type: "range", from: "2026-09", to: "2026-07" }, span)).toMatchObject({
      start: "2026-07",
      end: "2026-09",
    });
  });
});

describe("listMonths and listQuarters", () => {
  it("lists newest first", () => {
    expect(listMonths(span)).toEqual(["2026-09", "2026-08", "2026-07", "2026-06"]);
    expect(listQuarters(span)).toEqual(["2026-Q3", "2026-Q2"]);
  });
});

describe("buildReport", () => {
  it("measures a month from the previous month-end", () => {
    const report = buildReport(history, parseReportPeriod({ month: "2026-09" }, span))!;

    expect(report.startDate).toBe("2026-08-30");
    expect(report.startValue).toBeCloseTo(900.14);
    expect(report.moneyInvested).toBeCloseTo(351.36);
    expect(report.marketGain).toBeCloseTo(59.01);
    expect(report.endValue).toBeCloseTo(1310.51);
    expect(report.startValue + report.moneyInvested + report.marketGain).toBeCloseTo(report.endValue);
    // 59.01 / (900.14 + 351.36 / 2)
    expect(report.periodReturn).toBeCloseTo(5.485, 2);
    expect(report.returnOnInvested).toBeCloseTo(1.628, 2);
    expect(report.isPartial).toBe(false);
  });

  it("starts from zero when the period holds the first snapshot", () => {
    const report = buildReport(history, parseReportPeriod({ type: "quarter", quarter: "2026-Q2" }, span))!;

    expect(report.startDate).toBeNull();
    expect(report.startValue).toBe(0);
    expect(report.moneyInvested).toBeCloseTo(312.72);
    expect(report.marketGain).toBeCloseTo(-12.67);
    expect(report.periodReturn).toBeCloseTo(-4.0515, 3);
    expect(report.monthly.map((m) => m.month)).toEqual(["2026-06"]);
  });

  it("covers every month of a quarter", () => {
    const report = buildReport(history, parseReportPeriod({ type: "quarter", quarter: "2026-Q3" }, span))!;

    expect(report.startDate).toBe("2026-06-30");
    expect(report.marketGain).toBeCloseTo(33.66);
    expect(report.valueSeries.map((p) => p.snapshotDate)).toEqual(["2026-06-30", "2026-07-30", "2026-08-30", "2026-09-30"]);
    expect(report.monthly.map((m) => m.month)).toEqual(["2026-07", "2026-08", "2026-09"]);
  });

  it("flags a period whose last snapshot is not month-end", () => {
    const report = buildReport([...history, point("2026-10-06", 1300, 1320)], {
      type: "month",
      start: "2026-10",
      end: "2026-10",
      label: "October 2026",
    })!;

    expect(report.isPartial).toBe(true);
    expect(report.endDate).toBe("2026-10-06");
  });

  it("is null when the period has no snapshot", () => {
    expect(buildReport(history, { type: "month", start: "2026-12", end: "2026-12", label: "" })).toBeNull();
  });
});
