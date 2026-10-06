import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseDecimal, parsePortfolioCsv } from "@/lib/portfolio/importer/import-validator";

const SAMPLE_CSV = readFileSync(
  path.join(process.cwd(), "fixtures/tickertape-sample.csv"),
  "utf8",
);

describe("parseDecimal", () => {
  it("accepts common numeric formats", () => {
    expect(parseDecimal("1,234.56")?.toString()).toBe("1234.56");
    expect(parseDecimal(" $1,234 ")?.toString()).toBe("1234");
    expect(parseDecimal("12.5%")?.toString()).toBe("12.5");
    expect(parseDecimal("(12.30)")?.toString()).toBe("-12.3");
    expect(parseDecimal("−4.2")?.toString()).toBe("-4.2");
    expect(parseDecimal(".5")?.toString()).toBe("0.5");
  });

  it("distinguishes empty cells from invalid ones", () => {
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal(" - ")).toBeNull();
    expect(parseDecimal("abc")).toBeUndefined();
    expect(parseDecimal("1.2.3")).toBeUndefined();
  });
});

describe("parsePortfolioCsv with the Tickertape sample", () => {
  const result = parsePortfolioCsv(SAMPLE_CSV);

  it("parses every holding", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.holdings).toHaveLength(11);
  });

  it("keeps CSV facts as reported and derives only P&L %", () => {
    if (!result.ok) throw new Error("expected success");

    const grab = result.holdings.find((h) => h.sourceName === "Grab Holdings Ltd");

    expect(grab).toMatchObject({
      rowNumber: 4,
      normalizedName: "grab holdings ltd",
      quantity: "19",
      averageBuyPrice: "3.3",
      currentPrice: "3.16",
      investedAmount: "62.8",
      currentValue: "60.21",
      weight: "10.24",
      pnlAmount: "-2.59",
    });
    expect(Number(grab?.pnlPercentage)).toBeCloseTo(-4.1242, 4);
    expect(result.derivedFields).toEqual(["P&L %"]);
  });

  it("keeps fractional quantities and special characters in names", () => {
    if (!result.ok) throw new Error("expected success");

    expect(result.holdings[0]).toMatchObject({
      sourceName: "Avantis® U.S. Small Cap Value ETF",
      quantity: "0.67067",
    });
  });
});

describe("parsePortfolioCsv derivation", () => {
  it("derives value, invested, P&L and weight from the four required columns", () => {
    const result = parsePortfolioCsv(
      "Name,Qty,Avg Price,LTP\nAlpha,10,10,15\nBeta,5,20,10\n",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.holdings[0]).toMatchObject({
      investedAmount: "100",
      currentValue: "150",
      pnlAmount: "50",
      pnlPercentage: "50",
      weight: "75",
    });
    expect(result.holdings[1]).toMatchObject({ pnlPercentage: "-50", weight: "25" });
  });
});

describe("parsePortfolioCsv errors", () => {
  it("rejects an empty file and a header-only file", () => {
    expect(parsePortfolioCsv("")).toEqual({ ok: false, errors: ["The file is empty."] });
    expect(parsePortfolioCsv("Name,Qty,Avg Price,LTP\n").ok).toBe(false);
  });

  it("reports missing required columns", () => {
    const result = parsePortfolioCsv("Name,Weight\nAlpha,10\n");

    expect(result.ok).toBe(false);
  });

  it("reports invalid values with their row number", () => {
    const result = parsePortfolioCsv("Name,Qty,Avg Price,LTP\nAlpha,abc,10,15\nBeta,0,10,15\n");

    expect(result).toEqual({
      ok: false,
      errors: [
        'Row 2: Quantity "abc" is not a number.',
        "Row 3: Quantity must be greater than zero.",
      ],
    });
  });

  it("rejects the same security twice", () => {
    const result = parsePortfolioCsv("Name,Qty,Avg Price,LTP\nAlpha,1,10,15\n alpha ,2,10,15\n");

    expect(result).toEqual({
      ok: false,
      errors: ['Row 3: "alpha" already appears on row 2.'],
    });
  });
});
