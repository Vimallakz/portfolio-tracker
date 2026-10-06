import { describe, expect, it } from "vitest";

import { mapColumns, normalizeHeader } from "@/lib/portfolio/importer/column-mapper";

const TICKERTAPE_HEADERS = [
  "Stock Name",
  "1D Change",
  "Day P&L ($)",
  "Quantity",
  "LTP ($)",
  "Avg Buy Price ($)",
  "Invested Amount ($)",
  "Current Value ($)",
  "Weight",
  "P&L ($)",
];

describe("normalizeHeader", () => {
  it("ignores case, spacing and punctuation", () => {
    expect(normalizeHeader("Stock Name")).toBe("stockname");
    expect(normalizeHeader("stock name")).toBe("stockname");
    expect(normalizeHeader("StockName")).toBe("stockname");
  });

  it("drops currency markers but keeps percent distinct", () => {
    expect(normalizeHeader("P&L ($)")).toBe("pandl");
    expect(normalizeHeader("P&L %")).toBe("pandlpct");
    expect(normalizeHeader("P&L (%)")).toBe("pandlpct");
  });
});

describe("mapColumns", () => {
  it("maps the Tickertape export and ignores unrelated columns", () => {
    const result = mapColumns(TICKERTAPE_HEADERS);

    expect(result).toEqual({
      ok: true,
      mapping: {
        name: 0,
        quantity: 3,
        currentPrice: 4,
        averageBuyPrice: 5,
        investedAmount: 6,
        currentValue: 7,
        weight: 8,
        pnlAmount: 9,
      },
    });
  });

  it("does not depend on column order", () => {
    const result = mapColumns(["LTP", "qty", "Average Buy Price", "Name", "P&L %"]);

    expect(result).toEqual({
      ok: true,
      mapping: { currentPrice: 0, quantity: 1, averageBuyPrice: 2, name: 3, pnlPercentage: 4 },
    });
  });

  it("reports every missing required column", () => {
    const result = mapColumns(["Stock Name", "Weight"]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveLength(3);
      expect(result.errors.join(" ")).toContain("Quantity");
    }
  });

  it("rejects two columns for the same field", () => {
    const result = mapColumns(["Stock Name", "Name", "Qty", "Avg Price", "LTP"]);

    expect(result.ok).toBe(false);
  });
});
