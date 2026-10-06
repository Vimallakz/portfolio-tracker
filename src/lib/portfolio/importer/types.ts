/**
 * A validated CSV row. Numbers are decimal strings, not JS numbers, so they
 * survive the JSON round trip through ImportSession.payload without float
 * rounding and go straight into Prisma Decimal columns.
 */
export type ParsedHolding = {
  rowNumber: number;
  sourceName: string;
  normalizedName: string;
  quantity: string;
  averageBuyPrice: string;
  investedAmount: string;
  currentPrice: string;
  currentValue: string;
  weight: string;
  pnlAmount: string;
  pnlPercentage: string;
};

export type ParseSuccess = {
  ok: true;
  holdings: ParsedHolding[];
  /** Optional columns that were absent and therefore calculated. */
  derivedFields: string[];
};

export type ParseFailure = { ok: false; errors: string[] };

export type ParseResult = ParseSuccess | ParseFailure;
