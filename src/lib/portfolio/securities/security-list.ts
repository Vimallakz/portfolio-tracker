import type { Conviction, InvestmentStatus, SecurityType } from "@/generated/prisma/enums";
import { CONVICTIONS, INVESTMENT_STATUSES } from "@/lib/research/labels";
import type { TagSummary } from "@/lib/tags/schema";

/** One holding in the latest snapshot, joined with the profile's research and tags. */
export type SecurityListRow = {
  securityId: string;
  name: string;
  ticker: string | null;
  type: SecurityType;
  quantity: number;
  investedAmount: number;
  currentValue: number;
  pnlAmount: number;
  pnlPercentage: number;
  weight: number;
  conviction: Conviction | null;
  investmentStatus: InvestmentStatus | null;
  tags: TagSummary[];
};

export type SecurityListFilters = {
  query: string;
  type: "ALL" | SecurityType;
  /** A tag id, or ALL. */
  tag: string;
  status: "ALL" | "NONE" | InvestmentStatus;
  conviction: "ALL" | "NONE" | Conviction;
  pnl: "ALL" | "GAIN" | "LOSS";
  ticker: "ALL" | "MISSING";
};

export const DEFAULT_SECURITY_FILTERS: SecurityListFilters = {
  query: "",
  type: "ALL",
  tag: "ALL",
  status: "ALL",
  conviction: "ALL",
  pnl: "ALL",
  ticker: "ALL",
};

const matchesChoice = <T extends string>(choice: "ALL" | "NONE" | T, value: T | null) =>
  choice === "ALL" || (choice === "NONE" ? value === null : value === choice);

export function filterSecurityRows(rows: SecurityListRow[], filters: SecurityListFilters): SecurityListRow[] {
  const query = filters.query.trim().toLowerCase();

  return rows.filter(
    (row) =>
      (!query || row.name.toLowerCase().includes(query) || row.ticker?.toLowerCase().includes(query)) &&
      (filters.type === "ALL" || row.type === filters.type) &&
      (filters.tag === "ALL" || row.tags.some((tag) => tag.id === filters.tag)) &&
      matchesChoice(filters.status, row.investmentStatus) &&
      matchesChoice(filters.conviction, row.conviction) &&
      (filters.pnl === "ALL" || (filters.pnl === "GAIN" ? row.pnlAmount > 0 : row.pnlAmount < 0)) &&
      (filters.ticker === "ALL" || row.ticker === null),
  );
}

export type SecuritySortKey =
  | "name"
  | "type"
  | "quantity"
  | "investedAmount"
  | "currentValue"
  | "pnlAmount"
  | "pnlPercentage"
  | "weight"
  | "investmentStatus"
  | "conviction";

export type SecuritySort = { key: SecuritySortKey; direction: "asc" | "desc" };

export const DEFAULT_SECURITY_SORT: SecuritySort = { key: "weight", direction: "desc" };

/** Comparable value for a row, or null when unset. Unset values always sort last. */
function sortValue(row: SecurityListRow, key: SecuritySortKey): string | number | null {
  switch (key) {
    case "name":
      return row.name.toLowerCase();
    case "type":
      return row.type;
    case "investmentStatus":
      return row.investmentStatus ? INVESTMENT_STATUSES.indexOf(row.investmentStatus) : null;
    case "conviction":
      return row.conviction ? CONVICTIONS.indexOf(row.conviction) : null;
    default:
      return row[key];
  }
}

export function sortSecurityRows(rows: SecurityListRow[], sort: SecuritySort): SecurityListRow[] {
  const sign = sort.direction === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const left = sortValue(a, sort.key);
    const right = sortValue(b, sort.key);

    if (left === null || right === null) {
      return left === right ? 0 : left === null ? 1 : -1;
    }

    return (left < right ? -1 : left > right ? 1 : 0) * sign;
  });
}
