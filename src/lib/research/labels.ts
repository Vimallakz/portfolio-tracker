import type { Conviction, InvestmentStatus } from "@/generated/prisma/enums";

export const CONVICTIONS: readonly Conviction[] = ["LOW", "MEDIUM", "HIGH", "VERY_HIGH"];

export const CONVICTION_LABEL: Record<Conviction, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  VERY_HIGH: "Very high",
};

/** Out of five, so Very high reads as full marks. */
export const CONVICTION_STARS: Record<Conviction, number> = {
  LOW: 2,
  MEDIUM: 3,
  HIGH: 4,
  VERY_HIGH: 5,
};

export const INVESTMENT_STATUSES: readonly InvestmentStatus[] = ["WATCH", "ACCUMULATE", "HOLD", "REDUCE", "EXIT"];

export const INVESTMENT_STATUS_LABEL: Record<InvestmentStatus, string> = {
  WATCH: "Watch",
  ACCUMULATE: "Accumulate",
  HOLD: "Hold",
  REDUCE: "Reduce",
  EXIT: "Exit",
};
