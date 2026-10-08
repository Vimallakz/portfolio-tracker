import { describe, expect, it } from "vitest";

import type { HistoryPoint } from "@/lib/portfolio/analytics/dashboard";
import { buildMonthlyPerformance } from "@/lib/portfolio/analytics/monthly-performance";
import { averageContribution, buildMonthlyContributions } from "@/lib/portfolio/planner/contributions";
import { annualizeMonthlyReturn, summarizeEarnings } from "@/lib/portfolio/planner/earnings";
import { projectInvestment } from "@/lib/portfolio/planner/projection";

const point = (snapshotDate: string, investedAmount: number, currentValue: number): HistoryPoint => ({
  snapshotDate,
  investedAmount,
  currentValue,
  pnlAmount: currentValue - investedAmount,
});

describe("buildMonthlyContributions", () => {
  it("is empty without history", () => {
    expect(buildMonthlyContributions([])).toEqual([]);
  });

  it("counts everything invested by the first snapshot as its month, then measures from each month-end", () => {
    const months = buildMonthlyContributions([
      point("2026-01-31", 1000, 1000),
      point("2026-02-28", 1300, 1350),
      point("2026-03-30", 1250, 1300),
    ]);

    expect(months.map((entry) => [entry.month, entry.amount, entry.isBaseline])).toEqual([
      ["2026-01", 1000, true],
      ["2026-02", 300, false],
      ["2026-03", -50, false],
    ]);
  });

  it("uses the last snapshot of a month", () => {
    const months = buildMonthlyContributions([
      point("2026-01-31", 1000, 1000),
      point("2026-02-10", 1100, 1100),
      point("2026-02-28", 1400, 1400),
    ]);

    expect(months[1]).toMatchObject({ month: "2026-02", amount: 400, fromDate: "2026-01-31", toDate: "2026-02-28" });
  });

  it("splits a change across skipped months and marks them estimated", () => {
    const months = buildMonthlyContributions([point("2026-01-31", 1000, 1000), point("2026-04-30", 1600, 1700)]);

    expect(months.map((entry) => [entry.month, entry.amount, entry.isEstimated])).toEqual([
      ["2026-01", 1000, false],
      ["2026-02", 200, true],
      ["2026-03", 200, true],
      ["2026-04", 200, true],
    ]);
  });
});

describe("averageContribution", () => {
  const months = buildMonthlyContributions([
    point("2025-12-31", 500, 500),
    point("2026-01-31", 1000, 1000),
    point("2026-04-30", 1600, 1600),
    point("2026-05-31", 2000, 2000),
  ]);

  it("averages the trailing window, including the first month", () => {
    expect(averageContribution(months, 3)).toEqual({ average: (200 + 200 + 400) / 3, monthsCounted: 3 });
    expect(averageContribution(months, 12)).toEqual({ average: 2000 / 6, monthsCounted: 6 });
  });

  it("uses the first snapshot alone", () => {
    expect(averageContribution(buildMonthlyContributions([point("2026-01-31", 1000, 1000)]), 6)).toEqual({
      average: 1000,
      monthsCounted: 1,
    });
  });

  it("is null without history", () => {
    expect(averageContribution([], 6)).toEqual({ average: null, monthsCounted: 0 });
  });
});

describe("summarizeEarnings", () => {
  it("divides the total gain by the money at work each month", () => {
    const months = buildMonthlyPerformance([
      point("2026-01-31", 1000, 1000),
      point("2026-02-28", 1000, 1100),
      point("2026-03-31", 1000, 1210),
    ]);

    // Bases: February 1000, March 1100; January (the first month) 1000 with no gain.
    expect(summarizeEarnings(months, 2)).toMatchObject({ totalGain: 210, monthsCovered: 2 });
    expect(summarizeEarnings(months, 2)!.averageMonthlyGain).toBeCloseTo(105);
    expect(summarizeEarnings(months, 2)!.averageMonthlyReturn).toBeCloseTo((210 / 2100) * 100);

    const allTime = summarizeEarnings(months, null)!;

    expect(allTime.monthsCovered).toBe(3);
    expect(allTime.averageMonthlyGain).toBeCloseTo(70);
    expect(allTime.averageMonthlyReturn).toBeCloseTo((210 / 3100) * 100);
  });

  it("counts a change across skipped months once per month it spans", () => {
    const months = buildMonthlyPerformance([point("2026-01-31", 1000, 1000), point("2026-03-31", 1000, 1210)]);

    const summary = summarizeEarnings(months, 2)!;

    expect(summary.monthsCovered).toBe(2);
    expect(summary.averageMonthlyGain).toBeCloseTo(105);
    expect(summary.averageMonthlyReturn).toBeCloseTo((210 / 2000) * 100);
  });

  it("is positive when the portfolio is up, even if most months lost", () => {
    const months = buildMonthlyPerformance([
      point("2026-06-30", 312.72, 300.05),
      point("2026-07-30", 625.44, 600.09),
      point("2026-08-30", 938.16, 900.14),
      point("2026-09-30", 1289.52, 1310.51),
    ]);

    const summary = summarizeEarnings(months, null)!;

    expect(summary.totalGain).toBeCloseTo(20.99);
    // 20.99 / (312.72 + 456.41 + 756.45 + 1075.82)
    expect(summary.averageMonthlyReturn).toBeCloseTo(0.8069, 3);
  });

  it("counts the first snapshot's P&L as its month", () => {
    const summary = summarizeEarnings(buildMonthlyPerformance([point("2026-06-30", 312.72, 300.05)]), null)!;

    expect(summary.totalGain).toBeCloseTo(-12.67);
    expect(summary.averageMonthlyReturn).toBeCloseTo(-4.0515, 3);
  });

  it("limits to the trailing window", () => {
    const months = buildMonthlyPerformance([
      point("2026-01-31", 1000, 1000),
      point("2026-02-28", 1000, 1100),
      point("2026-03-31", 1000, 1210),
    ]);

    expect(summarizeEarnings(months, 1)!.totalGain).toBeCloseTo(110);
  });

  it("is null without history", () => {
    expect(summarizeEarnings([], 6)).toBeNull();
  });
});

describe("annualizeMonthlyReturn", () => {
  it("compounds twelve months", () => {
    expect(annualizeMonthlyReturn(1)).toBeCloseTo(12.6825, 3);
  });
});

describe("projectInvestment", () => {
  const base = { startValue: 1000, startInvested: 800, monthlyContribution: 100, monthlyReturn: 0, months: 12, stepUp: null };

  it("adds contributions without growth at 0%", () => {
    const projection = projectInvestment(base);

    expect(projection.finalValue).toBeCloseTo(2200);
    expect(projection.finalInvested).toBeCloseTo(2000);
    expect(projection.totalContributed).toBeCloseTo(1200);
    expect(projection.projectedGain).toBeCloseTo(0);
    expect(projection.points).toHaveLength(13);
  });

  it("grows the balance before adding the month's investment", () => {
    const projection = projectInvestment({ ...base, monthlyContribution: 0, monthlyReturn: 1 });

    expect(projection.finalValue).toBeCloseTo(1000 * 1.01 ** 12);
  });

  it("steps up by a percentage after each interval", () => {
    const projection = projectInvestment({ ...base, stepUp: { everyMonths: 6, kind: "percent", value: 10 } });

    expect(projection.points.map((p) => Number(p.contribution.toFixed(6))).slice(1)).toEqual([...Array(6).fill(100), ...Array(6).fill(110)]);
    expect(projection.totalContributed).toBeCloseTo(1260);
  });

  it("steps up by a fixed amount after each interval", () => {
    const projection = projectInvestment({ ...base, stepUp: { everyMonths: 3, kind: "amount", value: 50 } });

    expect(projection.points.at(-1)!.contribution).toBe(250);
    expect(projection.totalContributed).toBeCloseTo(300 + 450 + 600 + 750);
  });
});
