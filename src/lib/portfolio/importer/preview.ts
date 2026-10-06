import type { SecurityType } from "@/generated/prisma/enums";
import type {
  ComparisonSummary,
  HoldingComparison,
} from "@/lib/portfolio/comparison/snapshot-comparator";

/**
 * What the browser receives for the import preview. Shaped for rendering only:
 * no raw database rows, and decimals as strings.
 */
export type PreviewHolding = HoldingComparison & {
  ticker: string | null;
  type: SecurityType;
  /** First time this name has been imported; a Security will be created. */
  isNewSecurity: boolean;
};

export type DuplicateSnapshot = {
  snapshotId: string;
  snapshotDate: string;
  reason: "SAME_CONTENT" | "SAME_DATE";
};

export type PortfolioTotals = {
  investedAmount: string;
  currentValue: string;
  pnlAmount: string;
  pnlPercentage: string;
};

export type ImportPreview = {
  sessionId: string;
  profileName: string;
  fileName: string;
  snapshotDate: string;
  previousSnapshotDate: string | null;
  summary: ComparisonSummary & { newSecurities: number; withoutTicker: number };
  totals: PortfolioTotals;
  holdings: PreviewHolding[];
  duplicate: DuplicateSnapshot | null;
  derivedFields: string[];
};

export type ImportConfirmation = {
  snapshotId: string;
  snapshotDate: string;
  holdingCount: number;
  createdSecurities: number;
};
