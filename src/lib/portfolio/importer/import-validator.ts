import Decimal from "decimal.js";

import {
  calculateCurrentValue,
  calculateInvestedAmount,
  calculatePnl,
  calculatePnlPercentage,
  calculatePortfolioWeight,
  sumDecimals,
} from "@/lib/portfolio/analytics/calculations";
import { CsvSyntaxError, parseCsv } from "@/lib/portfolio/importer/csv-parser";
import {
  FIELD_LABELS,
  mapColumns,
  type ColumnMapping,
  type HoldingField,
} from "@/lib/portfolio/importer/column-mapper";
import type { ParsedHolding, ParseResult } from "@/lib/portfolio/importer/types";
import { normalizeSecurityName } from "@/lib/portfolio/securities/security-name";

export const MAX_HOLDING_ROWS = 1000;
const MAX_NAME_LENGTH = 200;
const MAX_REPORTED_ERRORS = 20;

const MONEY_SCALE = 4;
const QUANTITY_SCALE = 6;

const NUMBER_PATTERN = /^-?(?:\d+\.?\d*|\.\d+)$/;
const EMPTY_MARKERS = new Set(["", "-", "—", "–", "n/a", "na"]);

/**
 * Accepts "1,234.56", "$1,234", "12.5%", "(12.30)" and "−4.2". Returns null for
 * an empty cell and undefined for something that is not a number at all.
 */
export function parseDecimal(raw: string): Decimal | null | undefined {
  let value = raw.trim().toLowerCase();

  if (EMPTY_MARKERS.has(value)) {
    return null;
  }

  let negative = false;

  if (value.startsWith("(") && value.endsWith(")")) {
    negative = true;
    value = value.slice(1, -1);
  }

  value = value.replace(/[\s,$₹€£%]/g, "").replace(/^[−–]/, "-");

  if (!NUMBER_PATTERN.test(value)) {
    return undefined;
  }

  const parsed = new Decimal(value);

  return negative ? parsed.neg() : parsed;
}

type RowContext = {
  cells: string[];
  rowNumber: number;
  mapping: ColumnMapping;
  errors: string[];
};

function readNumber(
  { cells, rowNumber, mapping, errors }: RowContext,
  field: HoldingField,
  options: { required: boolean; min?: "positive" | "nonNegative" },
): Decimal | null {
  const index = mapping[field];
  const raw = index === undefined ? "" : (cells[index] ?? "");
  const parsed = parseDecimal(raw);
  const label = FIELD_LABELS[field];

  if (parsed === undefined) {
    errors.push(`Row ${rowNumber}: ${label} "${raw.trim()}" is not a number.`);
    return null;
  }

  if (parsed === null) {
    if (options.required) {
      errors.push(`Row ${rowNumber}: ${label} is empty.`);
    }
    return null;
  }

  if (options.min === "positive" && !parsed.gt(0)) {
    errors.push(`Row ${rowNumber}: ${label} must be greater than zero.`);
    return null;
  }

  if (options.min === "nonNegative" && parsed.isNegative()) {
    errors.push(`Row ${rowNumber}: ${label} cannot be negative.`);
    return null;
  }

  return parsed;
}

type DraftHolding = Omit<ParsedHolding, "weight"> & { weight: Decimal | null };

function parseRow(context: RowContext): DraftHolding | null {
  const { cells, rowNumber, mapping, errors } = context;
  const errorCountBefore = errors.length;

  const sourceName = (cells[mapping.name!] ?? "").trim().replace(/\s+/g, " ");

  if (!sourceName) {
    errors.push(`Row ${rowNumber}: Stock Name is empty.`);
  } else if (sourceName.length > MAX_NAME_LENGTH) {
    errors.push(`Row ${rowNumber}: Stock Name is longer than ${MAX_NAME_LENGTH} characters.`);
  }

  const quantity = readNumber(context, "quantity", { required: true, min: "positive" });
  const averageBuyPrice = readNumber(context, "averageBuyPrice", { required: true, min: "nonNegative" });
  const currentPrice = readNumber(context, "currentPrice", { required: true, min: "nonNegative" });
  const investedCell = readNumber(context, "investedAmount", { required: false, min: "nonNegative" });
  const valueCell = readNumber(context, "currentValue", { required: false, min: "nonNegative" });
  const weightCell = readNumber(context, "weight", { required: false, min: "nonNegative" });
  const pnlCell = readNumber(context, "pnlAmount", { required: false });
  const pnlPercentCell = readNumber(context, "pnlPercentage", { required: false });

  if (errors.length > errorCountBefore || !quantity || !averageBuyPrice || !currentPrice) {
    return null;
  }

  const investedAmount = investedCell ?? calculateInvestedAmount(quantity, averageBuyPrice);
  const currentValue = valueCell ?? calculateCurrentValue(quantity, currentPrice);
  const pnlAmount = pnlCell ?? calculatePnl(currentValue, investedAmount);
  const pnlPercentage = pnlPercentCell ?? calculatePnlPercentage(currentValue, investedAmount);

  const money = (value: Decimal) => value.toDecimalPlaces(MONEY_SCALE).toFixed();

  return {
    rowNumber,
    sourceName,
    normalizedName: normalizeSecurityName(sourceName),
    quantity: quantity.toDecimalPlaces(QUANTITY_SCALE).toFixed(),
    averageBuyPrice: money(averageBuyPrice),
    investedAmount: money(investedAmount),
    currentPrice: money(currentPrice),
    currentValue: money(currentValue),
    pnlAmount: money(pnlAmount),
    pnlPercentage: money(pnlPercentage),
    weight: weightCell,
  };
}

function cappedErrors(errors: string[]): string[] {
  if (errors.length <= MAX_REPORTED_ERRORS) {
    return errors;
  }

  return [
    ...errors.slice(0, MAX_REPORTED_ERRORS),
    `…and ${errors.length - MAX_REPORTED_ERRORS} more problems.`,
  ];
}

/**
 * CSV text → validated holdings. Pure: no database access, so the same rules
 * run in tests and in the import action.
 */
export function parsePortfolioCsv(text: string): ParseResult {
  let rows: string[][];

  try {
    rows = parseCsv(text);
  } catch (error) {
    if (error instanceof CsvSyntaxError) {
      return { ok: false, errors: [`Invalid CSV: ${error.message}`] };
    }
    throw error;
  }

  if (rows.length === 0) {
    return { ok: false, errors: ["The file is empty."] };
  }

  const [headers, ...dataRows] = rows;
  const columns = mapColumns(headers);

  if (!columns.ok) {
    return { ok: false, errors: columns.errors };
  }

  if (dataRows.length === 0) {
    return { ok: false, errors: ["The file has a header row but no holdings."] };
  }

  if (dataRows.length > MAX_HOLDING_ROWS) {
    return {
      ok: false,
      errors: [`The file has ${dataRows.length} rows; the limit is ${MAX_HOLDING_ROWS}.`],
    };
  }

  const errors: string[] = [];
  const drafts: DraftHolding[] = [];
  const firstRowByName = new Map<string, number>();

  dataRows.forEach((cells, index) => {
    // Row 1 is the header, so the first holding is row 2 as a spreadsheet shows it.
    const rowNumber = index + 2;
    const draft = parseRow({ cells, rowNumber, mapping: columns.mapping, errors });

    if (!draft) {
      return;
    }

    const seenAt = firstRowByName.get(draft.normalizedName);

    if (seenAt !== undefined) {
      errors.push(`Row ${rowNumber}: "${draft.sourceName}" already appears on row ${seenAt}.`);
      return;
    }

    firstRowByName.set(draft.normalizedName, rowNumber);
    drafts.push(draft);
  });

  if (errors.length > 0) {
    return { ok: false, errors: cappedErrors(errors) };
  }

  const totalValue = sumDecimals(drafts.map((draft) => draft.currentValue));

  const holdings: ParsedHolding[] = drafts.map((draft) => ({
    ...draft,
    weight: (draft.weight ?? calculatePortfolioWeight(draft.currentValue, totalValue))
      .toDecimalPlaces(MONEY_SCALE)
      .toFixed(),
  }));

  const derivedFields = (
    ["investedAmount", "currentValue", "weight", "pnlAmount", "pnlPercentage"] as const
  )
    .filter((field) => columns.mapping[field] === undefined)
    .map((field) => FIELD_LABELS[field]);

  return { ok: true, holdings, derivedFields };
}
