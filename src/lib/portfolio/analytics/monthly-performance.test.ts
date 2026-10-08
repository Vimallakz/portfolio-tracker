import { describe, expect, it } from "vitest";

import type { HistoryPoint } from "@/lib/portfolio/analytics/dashboard";
import {
  addMonths,
  availableRanges,
  buildMonthlyPerformance,
  selectMonthlyRange,
} from "@/lib/portfolio/analytics/monthly-performance";

const point = (snapshotDate: string, investedAmount: number, currentValue: number): HistoryPoint => ({
  snapshotDate,
  investedAmount,
  currentValue,
  pnlAmount: currentValue - investedAmount,
});

describe("addMonths", () => {
  it("crosses year boundaries both ways", () => {
    expect(addMonths("2026-11", 2)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });
});

describe("buildMonthlyPerformance", () => {
  it("marks the first month as the baseline", () => {
    const [first] = buildMonthlyPerformance([point("2026-07-12", 1000, 1100)]);

    expect(first).toMatchObject({ month: "2026-07", isBaseline: true, gain: null, toDate: "2026-07-12" });
  });

  it("measures gain without counting new money", () => {
    const months = buildMonthlyPerformance([point("2026-07-31", 1000, 1000), point("2026-08-31", 1500, 1600)]);
    const august = months[1];

    // P&L went from 0 to 100; 500 of the value increase was new money.
    expect(august.gain).toBe(100);
    // Modified Dietz: 100 / (1000 + 500 / 2).
    expect(august.returnPercentage).toBeCloseTo(8);
    expect(august.fromDate).toBe("2026-07-31");
  });

  it("uses each month's last snapshot", () => {
    const months = buildMonthlyPerformance([
      point("2026-07-01", 1000, 1000),
      point("2026-08-05", 1000, 900),
      point("2026-08-28", 1000, 1050),
    ]);

    expect(months[1]).toMatchObject({ gain: 50, toDate: "2026-08-28" });
  });

  it("leaves months without snapshots empty and carries the change to the next snapshot", () => {
    const months = buildMonthlyPerformance([point("2026-07-12", 1000, 1000), point("2026-10-06", 1000, 900)]);

    expect(months.map((m) => m.month)).toEqual(["2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(months[1].gain).toBeNull();
    expect(months[3]).toMatchObject({ gain: -100, fromDate: "2026-07-12", returnPercentage: -10 });
  });

  it("returns nothing without history", () => {
    expect(buildMonthlyPerformance([])).toEqual([]);
  });
});

describe("selectMonthlyRange", () => {
  const months = buildMonthlyPerformance([point("2025-11-30", 1000, 1000), point("2026-03-31", 1000, 1100)]);

  it("ends every range at the latest month", () => {
    expect(selectMonthlyRange(months, "1M").map((m) => m.month)).toEqual(["2026-03"]);
    expect(selectMonthlyRange(months, "3M").map((m) => m.month)).toEqual(["2026-01", "2026-02", "2026-03"]);
  });

  it("starts YTD in January and ALL at the first snapshot", () => {
    expect(selectMonthlyRange(months, "YTD")[0].month).toBe("2026-01");
    expect(selectMonthlyRange(months, "ALL")[0].month).toBe("2025-11");
  });

  it("never starts before the first snapshot", () => {
    const year = selectMonthlyRange(months, "1Y");

    expect(year).toHaveLength(5);
    expect(year[0]).toMatchObject({ month: "2025-11", isBaseline: true });
  });
});

describe("availableRanges", () => {
  it("offers only ranges shorter than the history, plus ALL", () => {
    const months = buildMonthlyPerformance([point("2026-06-30", 1000, 1000), point("2026-10-06", 1000, 1100)]);

    expect(availableRanges(months)).toEqual(["1M", "3M", "ALL"]);
  });

  it("offers YTD once the history starts before January", () => {
    const months = buildMonthlyPerformance([point("2025-11-30", 1000, 1000), point("2026-03-31", 1000, 1100)]);

    expect(availableRanges(months)).toEqual(["1M", "3M", "YTD", "ALL"]);
  });

  it("offers only ALL without history", () => {
    expect(availableRanges([])).toEqual(["ALL"]);
  });
});
