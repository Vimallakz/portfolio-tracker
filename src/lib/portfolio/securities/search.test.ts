import { describe, expect, it } from "vitest";

import { searchSecurities } from "@/lib/portfolio/securities/search";

const items = [
  { name: "Invesco NASDAQ 100 ETF", ticker: "QQQM" },
  { name: "Nu Holdings Ltd", ticker: "NU" },
  { name: "SoundHound AI Inc", ticker: "SOUN" },
  { name: "Unmapped Holding", ticker: null },
];

const tickers = (query: string) => searchSecurities(items, query).map((item) => item.ticker);

describe("searchSecurities", () => {
  it("returns everything for an empty query", () => {
    expect(searchSecurities(items, "  ")).toEqual(items);
  });

  it("puts an exact ticker first", () => {
    expect(tickers("nu")).toEqual(["NU"]);
  });

  it("ranks word starts above matches inside a word", () => {
    expect(tickers("ho")).toEqual(["NU", null, "SOUN"]);
  });

  it("matches the start of any word in the name", () => {
    expect(tickers("holdings")).toEqual(["NU"]);
    expect(tickers("hound")).toEqual(["SOUN"]);
  });

  it("finds securities without a ticker by name", () => {
    expect(searchSecurities(items, "unmapped").map((item) => item.name)).toEqual(["Unmapped Holding"]);
  });

  it("returns nothing when nothing matches", () => {
    expect(searchSecurities(items, "zzz")).toEqual([]);
  });
});
