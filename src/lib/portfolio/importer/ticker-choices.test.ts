import { describe, expect, it } from "vitest";

import { parseTickerChoices } from "@/lib/portfolio/importer/ticker-choices";

describe("parseTickerChoices", () => {
  it("normalizes tickers and drops blank entries", () => {
    const result = parseTickerChoices({ "new:grab holdings ltd": " grab ", "sec-1": "", "sec-2": "voo" });

    expect(result).toEqual({
      ok: true,
      tickers: new Map([
        ["new:grab holdings ltd", "GRAB"],
        ["sec-2", "VOO"],
      ]),
    });
  });

  it("rejects an invalid ticker", () => {
    const result = parseTickerChoices({ a: "goog/l" });

    expect(result.ok).toBe(false);
  });

  it("rejects the same ticker on two securities, whatever the case", () => {
    const result = parseTickerChoices({ a: "GOOGL", b: "googl" });

    expect(result).toEqual({ ok: false, error: "GOOGL is entered for more than one security." });
  });
});
