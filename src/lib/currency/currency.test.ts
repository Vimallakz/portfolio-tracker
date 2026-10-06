import { describe, expect, it } from "vitest";

import { convertFromUsd, parseDisplayCurrency } from "@/lib/currency/currency";
import { rateOverrideInputSchema } from "@/lib/currency/schema";
import { formatCompactMoney, formatMoney } from "@/lib/format/number";

const rate = { rate: 96.42, date: "2026-10-06", source: "MARKET" as const };

describe("convertFromUsd", () => {
  it("converts only when INR is selected and a rate exists", () => {
    expect(convertFromUsd(10, "INR", rate)).toBeCloseTo(964.2);
    expect(convertFromUsd(10, "USD", rate)).toBe(10);
    expect(convertFromUsd(10, "INR", null)).toBe(10);
  });
});

describe("parseDisplayCurrency", () => {
  it("defaults to USD", () => {
    expect(parseDisplayCurrency("INR")).toBe("INR");
    expect(parseDisplayCurrency("EUR")).toBe("USD");
    expect(parseDisplayCurrency(undefined)).toBe("USD");
  });
});

describe("rupee formatting", () => {
  it("uses Indian digit grouping", () => {
    expect(formatMoney(5668000.5, "INR")).toBe("₹56,68,000.50");
    expect(formatCompactMoney(5668000, "INR")).toBe("₹56.7L");
  });
});

describe("rateOverrideInputSchema", () => {
  it("treats blank as no override", () => {
    expect(rateOverrideInputSchema.parse({ rate: "  " })).toEqual({ rate: null });
    expect(rateOverrideInputSchema.parse({ rate: "88.25" })).toEqual({ rate: "88.25" });
  });

  it.each(["0", "abc", "88.12345", "-5"])("rejects %s", (value) => {
    expect(rateOverrideInputSchema.safeParse({ rate: value }).success).toBe(false);
  });
});
