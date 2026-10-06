/**
 * Maps CSV headers to canonical holding fields by normalised name, never by
 * position, so a reordered or renamed Tickertape export still imports.
 */
export const HOLDING_FIELDS = [
  "name",
  "quantity",
  "averageBuyPrice",
  "currentPrice",
  "investedAmount",
  "currentValue",
  "weight",
  "pnlAmount",
  "pnlPercentage",
] as const;

export type HoldingField = (typeof HOLDING_FIELDS)[number];

/** The rest can be derived from these four. */
export const REQUIRED_FIELDS: readonly HoldingField[] = [
  "name",
  "quantity",
  "averageBuyPrice",
  "currentPrice",
];

export const FIELD_LABELS: Record<HoldingField, string> = {
  name: "Stock Name",
  quantity: "Quantity",
  averageBuyPrice: "Average Buy Price",
  currentPrice: "Current Price (LTP)",
  investedAmount: "Invested Amount",
  currentValue: "Current Value",
  weight: "Weight",
  pnlAmount: "P&L",
  pnlPercentage: "P&L %",
};

const FIELD_ALIASES: Record<HoldingField, string[]> = {
  name: ["stockname", "name", "securityname", "security", "stock", "instrument", "company", "companyname"],
  quantity: ["quantity", "qty", "shares", "units"],
  averageBuyPrice: ["avgbuyprice", "averagebuyprice", "avgprice", "averageprice", "buyprice", "avgcost", "averagecost"],
  currentPrice: ["ltp", "currentprice", "lastprice", "lasttradedprice", "marketprice", "price", "cmp"],
  investedAmount: ["investedamount", "invested", "investedvalue", "investment", "costbasis", "totalcost"],
  currentValue: ["currentvalue", "marketvalue", "value", "presentvalue"],
  weight: ["weight", "weightpct", "portfolioweight", "allocation", "allocationpct"],
  pnlAmount: ["pandl", "pnl", "profitandloss", "profitloss", "unrealisedpandl", "unrealizedpandl", "returns"],
  pnlPercentage: ["pandlpct", "pnlpct", "profitandlosspct", "returnspct", "returnpct"],
};

/**
 * "P&L ($)" → "pandl", "P&L (%)" → "pandlpct", "Stock Name" → "stockname".
 * Currency-only parentheticals are dropped; "%" is kept as "pct" so P&L and
 * P&L % stay distinct.
 */
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/\(\s*[$₹€£]\s*\)/g, " ")
    .replace(/%/g, " pct ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]/g, "");
}

const ALIAS_LOOKUP = new Map<string, HoldingField>(
  HOLDING_FIELDS.flatMap((field) =>
    FIELD_ALIASES[field].map((alias) => [alias, field] as const),
  ),
);

export type ColumnMapping = Partial<Record<HoldingField, number>>;

export type ColumnMappingResult =
  | { ok: true; mapping: ColumnMapping }
  | { ok: false; errors: string[] };

export function mapColumns(headers: string[]): ColumnMappingResult {
  const mapping: ColumnMapping = {};
  const errors: string[] = [];

  headers.forEach((header, index) => {
    const field = ALIAS_LOOKUP.get(normalizeHeader(header));

    if (!field) {
      return;
    }

    if (mapping[field] !== undefined) {
      errors.push(
        `Columns "${headers[mapping[field]]}" and "${header}" both look like ${FIELD_LABELS[field]}.`,
      );
      return;
    }

    mapping[field] = index;
  });

  for (const field of REQUIRED_FIELDS) {
    if (mapping[field] === undefined) {
      errors.push(`Missing required column: ${FIELD_LABELS[field]}.`);
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, mapping };
}
