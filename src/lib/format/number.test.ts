import { describe, expect, it } from "vitest";

import {
  PLACEHOLDER,
  formatMoney,
  formatMoneyChange,
  formatPercentage,
  formatQuantity,
  signednessOf,
} from "@/lib/format/number";

describe("formatMoney", () => {
  it("formats USD with two decimal places", () => {
    expect(formatMoney(12345.67)).toBe("$12,345.67");
    expect(formatMoney(0)).toBe("$0.00");
  });

  it("never renders NaN or Infinity", () => {
    expect(formatMoney(Number.NaN)).toBe(PLACEHOLDER);
    expect(formatMoney(Number.POSITIVE_INFINITY)).toBe(PLACEHOLDER);
    expect(formatMoney(null)).toBe(PLACEHOLDER);
    expect(formatMoney(undefined)).toBe(PLACEHOLDER);
  });
});

describe("formatMoneyChange", () => {
  it("always carries an explicit sign", () => {
    expect(formatMoneyChange(150)).toBe("+$150.00");
    expect(formatMoneyChange(-10)).toBe("-$10.00");
    expect(formatMoneyChange(0)).toBe("+$0.00");
  });
});

describe("formatPercentage", () => {
  it("signs the value and fixes the decimal places", () => {
    expect(formatPercentage(12.449)).toBe("+12.45%");
    expect(formatPercentage(-4.213)).toBe("-4.21%");
  });

  it("never renders NaN or Infinity", () => {
    expect(formatPercentage(Number.NaN)).toBe(PLACEHOLDER);
    expect(formatPercentage(Number.POSITIVE_INFINITY)).toBe(PLACEHOLDER);
  });
});

describe("formatQuantity", () => {
  it("avoids excessive decimal places", () => {
    expect(formatQuantity(120)).toBe("120");
    expect(formatQuantity(1200.5)).toBe("1,200.5");
  });
});

describe("signednessOf", () => {
  it("treats zero and non-finite values as neutral", () => {
    expect(signednessOf(0)).toBe("neutral");
    expect(signednessOf(Number.NaN)).toBe("neutral");
    expect(signednessOf(null)).toBe("neutral");
  });

  it("classifies gains and losses", () => {
    expect(signednessOf(1)).toBe("positive");
    expect(signednessOf(-1)).toBe("negative");
  });
});
