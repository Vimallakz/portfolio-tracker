import { describe, expect, it } from "vitest";

import { normalizeSecurityName } from "@/lib/portfolio/securities/security-name";

describe("normalizeSecurityName", () => {
  it("ignores case, surrounding whitespace and repeated spaces", () => {
    expect(normalizeSecurityName("  Grab   Holdings ")).toBe("grab holdings");
    expect(normalizeSecurityName("GRAB HOLDINGS")).toBe("grab holdings");
  });

  it("keeps punctuation that distinguishes securities", () => {
    expect(normalizeSecurityName("Vanguard S&P 500 ETF")).toBe("vanguard s&p 500 etf");
  });
});
