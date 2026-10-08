import type { SnapshotHoldingRow } from "@/lib/portfolio/analytics/dashboard";
import type { HoldingField } from "@/lib/portfolio/importer/column-mapper";

/**
 * Tickertape's own headers, in its order, plus P&L % which its export omits.
 * Every header is a column-mapper alias, so the file imports back.
 */
export const EXPORT_COLUMNS: readonly { header: string; field: HoldingField }[] = [
  { header: "Stock Name", field: "name" },
  { header: "Quantity", field: "quantity" },
  { header: "LTP ($)", field: "currentPrice" },
  { header: "Avg Buy Price ($)", field: "averageBuyPrice" },
  { header: "Invested Amount ($)", field: "investedAmount" },
  { header: "Current Value ($)", field: "currentValue" },
  { header: "Weight", field: "weight" },
  { header: "P&L ($)", field: "pnlAmount" },
  { header: "P&L (%)", field: "pnlPercentage" },
];

/** Not import fields, so the column mapper ignores them. */
const EXTRA_HEADERS = ["Ticker", "Type"] as const;

/** Spreadsheet apps run cells starting with these as formulas. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function escapeCell(value: string): string {
  return /[",\r\n]/.test(value) || value !== value.trim() ? `"${value.replace(/"/g, '""')}"` : value;
}

const textCell = (value: string) => escapeCell(FORMULA_PREFIX.test(value) ? `'${value}` : value);

/**
 * A snapshot as CSV with the stored values unrounded, so it opens in a
 * spreadsheet and imports back unchanged. Largest holdings first. Starts with
 * a BOM so Excel reads it as UTF-8.
 */
export function buildSnapshotCsv(holdings: SnapshotHoldingRow[]): string {
  const header = [...EXPORT_COLUMNS.map((column) => escapeCell(column.header)), ...EXTRA_HEADERS];

  const rows = [...holdings]
    .sort((a, b) => Number(b.currentValue) - Number(a.currentValue))
    .map((holding) => [
      ...EXPORT_COLUMNS.map(({ field }) => (field === "name" ? textCell(holding.name) : holding[field])),
      textCell(holding.ticker ?? ""),
      holding.type,
    ]);

  return `\uFEFF${[header, ...rows].map((row) => row.join(",")).join("\r\n")}\r\n`;
}

/** "portfolio_vimalraj-jana_2026-10-06.csv". The ISO date lets the importer prefill the snapshot date. */
export function snapshotCsvFileName(profileName: string, snapshotDate: string): string {
  const slug = profileName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `portfolio_${slug || "profile"}_${snapshotDate}.csv`;
}
