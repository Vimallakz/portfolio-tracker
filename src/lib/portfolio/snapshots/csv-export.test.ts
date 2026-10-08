import { describe, expect, it } from "vitest";

import type { SnapshotHoldingRow } from "@/lib/portfolio/analytics/dashboard";
import { mapColumns } from "@/lib/portfolio/importer/column-mapper";
import { parseCsv } from "@/lib/portfolio/importer/csv-parser";
import { parseFileNameDate } from "@/lib/portfolio/importer/file-name-date";
import { parsePortfolioCsv } from "@/lib/portfolio/importer/import-validator";
import { buildSnapshotCsv, EXPORT_COLUMNS, snapshotCsvFileName } from "@/lib/portfolio/snapshots/csv-export";

const holding = (overrides: Partial<SnapshotHoldingRow>): SnapshotHoldingRow => ({
  securityId: "sec",
  name: "Grab Holdings Ltd",
  ticker: "GRAB",
  type: "STOCK",
  quantity: "10.5",
  averageBuyPrice: "4.1234",
  investedAmount: "43.2957",
  currentPrice: "5",
  currentValue: "52.5",
  weight: "40",
  pnlAmount: "9.2043",
  pnlPercentage: "21.2591",
  ...overrides,
});

describe("buildSnapshotCsv", () => {
  const holdings = [
    holding({ securityId: "a" }),
    holding({
      securityId: "b",
      name: 'Vanguard S&P 500 ETF, "VOO"',
      ticker: "VOO",
      type: "ETF",
      currentValue: "78.75",
      weight: "60",
    }),
  ];

  it("starts with a BOM and the import headers, largest holding first", () => {
    const csv = buildSnapshotCsv(holdings);
    const rows = parseCsv(csv);

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(rows[0]).toEqual([
      "Stock Name",
      "Quantity",
      "LTP ($)",
      "Avg Buy Price ($)",
      "Invested Amount ($)",
      "Current Value ($)",
      "Weight",
      "P&L ($)",
      "P&L (%)",
      "Ticker",
      "Type",
    ]);
    expect(rows[1][0]).toBe('Vanguard S&P 500 ETF, "VOO"');
    expect(rows[2].slice(9)).toEqual(["GRAB", "STOCK"]);
  });

  it("imports back with the same values", () => {
    const result = parsePortfolioCsv(buildSnapshotCsv(holdings));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(
      result.holdings.map((h) => [h.sourceName, h.quantity, h.averageBuyPrice, h.currentPrice, h.currentValue, h.weight, h.pnlPercentage]),
    ).toEqual([
      ['Vanguard S&P 500 ETF, "VOO"', "10.5", "4.1234", "5", "78.75", "60", "21.2591"],
      ["Grab Holdings Ltd", "10.5", "4.1234", "5", "52.5", "40", "21.2591"],
    ]);
  });

  it("maps every export header to its import field", () => {
    const result = mapColumns(EXPORT_COLUMNS.map((column) => column.header));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.mapping).toEqual(Object.fromEntries(EXPORT_COLUMNS.map((column, index) => [column.field, index])));
  });

  it("neutralises names a spreadsheet would run as a formula", () => {
    const rows = parseCsv(buildSnapshotCsv([holding({ name: "=HYPERLINK(1)", ticker: null })]));

    expect(rows[1][0]).toBe("'=HYPERLINK(1)");
    expect(rows[1][9]).toBe("");
  });
});

describe("snapshotCsvFileName", () => {
  it("slugs the profile and carries a date the importer reads back", () => {
    const fileName = snapshotCsvFileName("Vimalraj Jana", "2026-10-06");

    expect(fileName).toBe("portfolio_vimalraj-jana_2026-10-06.csv");
    expect(parseFileNameDate(fileName)).toBe("2026-10-06");
  });

  it("falls back when the name has no usable characters", () => {
    expect(snapshotCsvFileName("!!!", "2026-10-06")).toBe("portfolio_profile_2026-10-06.csv");
  });
});
