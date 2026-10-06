import { describe, expect, it } from "vitest";

import {
  getTickertapeUrl,
  isValidTicker,
  normalizeTicker,
} from "@/lib/portfolio/securities/ticker";

describe("normalizeTicker", () => {
  it("uppercases and trims", () => {
    expect(normalizeTicker("  grab ")).toBe("GRAB");
  });
});

describe("isValidTicker", () => {
  it("accepts plain and class-suffixed tickers", () => {
    expect(isValidTicker("GRAB")).toBe(true);
    expect(isValidTicker("voo")).toBe(true);
    expect(isValidTicker("BRK.B")).toBe(true);
    expect(isValidTicker("BF-B")).toBe(true);
  });

  it("rejects empty, overlong and unsafe values", () => {
    expect(isValidTicker("")).toBe(false);
    expect(isValidTicker("ABCDEFGHIJ")).toBe(false);
    expect(isValidTicker("GRAB/../x")).toBe(false);
    expect(isValidTicker("https://evil.example")).toBe(false);
    expect(isValidTicker("A B")).toBe(false);
  });
});

describe("getTickertapeUrl", () => {
  it("builds the US stocks URL", () => {
    expect(getTickertapeUrl("GRAB")).toBe("https://www.tickertape.in/us-stocks/GRAB");
    expect(getTickertapeUrl(" any ")).toBe("https://www.tickertape.in/us-stocks/ANY");
  });

  it("refuses to build a URL from an invalid ticker", () => {
    expect(() => getTickertapeUrl("../admin")).toThrow();
  });
});
