import { describe, expect, it } from "vitest";

import { securityDetailsInputSchema } from "@/lib/portfolio/securities/schema";

const base = { ticker: "", type: "STOCK", tickertapeTicker: "", sector: "", industry: "" };

describe("securityDetailsInputSchema", () => {
  it("uppercases tickers and turns blanks into null", () => {
    expect(securityDetailsInputSchema.parse({ ...base, ticker: " grab ", sector: "Technology" })).toEqual({
      ticker: "GRAB",
      type: "STOCK",
      tickertapeTicker: null,
      sector: "Technology",
      industry: null,
    });
  });

  it("allows clearing the ticker", () => {
    expect(securityDetailsInputSchema.parse(base).ticker).toBeNull();
  });

  it("rejects tickers that could not be a symbol or a safe URL slug", () => {
    expect(securityDetailsInputSchema.safeParse({ ...base, ticker: "../admin" }).success).toBe(false);
    expect(securityDetailsInputSchema.safeParse({ ...base, tickertapeTicker: "https://x.y" }).success).toBe(false);
  });

  it("only accepts stock or ETF", () => {
    expect(securityDetailsInputSchema.safeParse({ ...base, type: "BOND" }).success).toBe(false);
  });
});
