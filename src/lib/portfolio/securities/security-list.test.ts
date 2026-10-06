import { describe, expect, it } from "vitest";

import {
  DEFAULT_SECURITY_FILTERS,
  filterSecurityRows,
  sortSecurityRows,
  type SecurityListFilters,
  type SecurityListRow,
} from "@/lib/portfolio/securities/security-list";

function row(securityId: string, overrides: Partial<SecurityListRow> = {}): SecurityListRow {
  return {
    securityId,
    name: securityId,
    ticker: securityId,
    type: "STOCK",
    quantity: 1,
    investedAmount: 100,
    currentValue: 100,
    pnlAmount: 0,
    pnlPercentage: 0,
    weight: 10,
    conviction: null,
    investmentStatus: null,
    tags: [],
    ...overrides,
  };
}

const GRAB = row("GRAB", { name: "Grab Holdings Ltd", pnlAmount: -2.59, pnlPercentage: -4.1, weight: 10, conviction: "HIGH", investmentStatus: "HOLD", tags: [{ id: "t-growth", name: "Growth" }] });
const VOO = row("VOO", { name: "Vanguard S&P 500 ETF", type: "ETF", pnlAmount: 4.48, pnlPercentage: 3.2, weight: 24, conviction: "VERY_HIGH" });
const NU = row("NU", { name: "Nu Holdings Ltd", ticker: null, pnlAmount: 0.51, pnlPercentage: 9.8, weight: 1 });

const ROWS = [GRAB, VOO, NU];

const filter = (overrides: Partial<SecurityListFilters>) =>
  filterSecurityRows(ROWS, { ...DEFAULT_SECURITY_FILTERS, ...overrides }).map((r) => r.securityId);

describe("filterSecurityRows", () => {
  it("returns everything with default filters", () => {
    expect(filter({})).toEqual(["GRAB", "VOO", "NU"]);
  });

  it("searches name and ticker case-insensitively", () => {
    expect(filter({ query: "holdings" })).toEqual(["GRAB", "NU"]);
    expect(filter({ query: "voo" })).toEqual(["VOO"]);
  });

  it("filters by type, tag, gain or loss, and missing ticker", () => {
    expect(filter({ type: "ETF" })).toEqual(["VOO"]);
    expect(filter({ tag: "t-growth" })).toEqual(["GRAB"]);
    expect(filter({ pnl: "LOSS" })).toEqual(["GRAB"]);
    expect(filter({ pnl: "GAIN" })).toEqual(["VOO", "NU"]);
    expect(filter({ ticker: "MISSING" })).toEqual(["NU"]);
  });

  it("distinguishes a specific status or conviction from none set", () => {
    expect(filter({ status: "HOLD" })).toEqual(["GRAB"]);
    expect(filter({ status: "NONE" })).toEqual(["VOO", "NU"]);
    expect(filter({ conviction: "NONE" })).toEqual(["NU"]);
  });
});

describe("sortSecurityRows", () => {
  const ids = (rows: SecurityListRow[]) => rows.map((r) => r.securityId);

  it("sorts numbers in both directions", () => {
    expect(ids(sortSecurityRows(ROWS, { key: "weight", direction: "desc" }))).toEqual(["VOO", "GRAB", "NU"]);
    expect(ids(sortSecurityRows(ROWS, { key: "pnlPercentage", direction: "asc" }))).toEqual(["GRAB", "VOO", "NU"]);
  });

  it("sorts by name alphabetically", () => {
    expect(ids(sortSecurityRows(ROWS, { key: "name", direction: "asc" }))).toEqual(["GRAB", "NU", "VOO"]);
  });

  it("orders conviction by strength and keeps unset values last either way", () => {
    expect(ids(sortSecurityRows(ROWS, { key: "conviction", direction: "desc" }))).toEqual(["VOO", "GRAB", "NU"]);
    expect(ids(sortSecurityRows(ROWS, { key: "conviction", direction: "asc" }))).toEqual(["GRAB", "VOO", "NU"]);
  });

  it("does not mutate the input", () => {
    const input = [...ROWS];
    sortSecurityRows(input, { key: "weight", direction: "asc" });
    expect(input).toEqual(ROWS);
  });
});
