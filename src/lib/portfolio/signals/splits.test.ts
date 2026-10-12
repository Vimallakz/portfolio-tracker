import { describe, expect, it } from "vitest";

import { parseSplits } from "@/lib/market-data/yahoo";
import { adjustForSplit, splitBetween } from "@/lib/portfolio/signals/splits";

describe("parseSplits", () => {
  it("reads Yahoo's split events as dated ratios in order", () => {
    const json = {
      chart: {
        result: [
          {
            events: {
              splits: {
                "1791552600": { date: 1791552600, numerator: 3, denominator: 1, splitRatio: "3:1" },
                "1700000000": { date: 1700000000, numerator: 1, denominator: 10, splitRatio: "1:10" },
              },
            },
          },
        ],
      },
    };

    expect(parseSplits(json)).toEqual([
      { date: "2023-11-14", ratio: 0.1 },
      { date: "2026-10-09", ratio: 3 },
    ]);
  });

  it("returns nothing without split events or for a bad answer", () => {
    expect(parseSplits({ chart: { result: [{}] } })).toEqual([]);
    expect(parseSplits({ chart: { result: null } })).toEqual([]);
    expect(parseSplits("nope")).toEqual([]);
  });
});

describe("splitBetween", () => {
  const splits = [
    { date: "2026-03-02", ratio: 2 },
    { date: "2026-10-09", ratio: 3 },
  ];

  it("finds the split after the older date, up to and including the newer one", () => {
    expect(splitBetween(splits, "2026-09-30", "2026-10-09")).toEqual({ date: "2026-10-09", ratio: 3 });
    expect(splitBetween(splits, "2026-09-30", "2026-10-08")).toBeNull();
  });

  it("ignores a split on the older date, whose price already reflects it", () => {
    expect(splitBetween(splits, "2026-10-09", "2026-10-12")).toBeNull();
  });

  it("combines several splits", () => {
    expect(splitBetween(splits, "2026-01-01", "2026-10-12")).toEqual({ date: "2026-10-09", ratio: 6 });
  });
});

describe("adjustForSplit", () => {
  it("turns the DXJ snapshot price into post-split dollars", () => {
    const split = { date: "2026-10-09", ratio: 3 };

    expect(adjustForSplit(184.16, split)).toBeCloseTo(61.39, 2);
    expect(adjustForSplit(184.16, null)).toBe(184.16);
    expect(adjustForSplit(null, split)).toBeNull();
  });

  it("raises old prices after a reverse split", () => {
    expect(adjustForSplit(2, { date: "2026-10-09", ratio: 0.1 })).toBe(20);
  });
});
