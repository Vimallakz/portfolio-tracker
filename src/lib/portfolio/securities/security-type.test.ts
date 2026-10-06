import { describe, expect, it } from "vitest";

import { guessSecurityType } from "@/lib/portfolio/securities/security-type";

describe("guessSecurityType", () => {
  it("recognises ETFs and index funds by name", () => {
    expect(guessSecurityType("Vanguard S&P 500 ETF")).toBe("ETF");
    expect(guessSecurityType("Vanguard Total International Stock Index Fund ETF Shares")).toBe("ETF");
    expect(guessSecurityType("Avantis® U.S. Small Cap Value ETF")).toBe("ETF");
  });

  it("defaults to stock", () => {
    expect(guessSecurityType("Grab Holdings Ltd")).toBe("STOCK");
    expect(guessSecurityType("Alphabet Inc Class A")).toBe("STOCK");
    expect(guessSecurityType("Netflix")).toBe("STOCK");
  });
});
