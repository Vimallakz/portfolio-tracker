/**
 * Display formatters. Every one of these is total-protection against the
 * NaN/Infinity requirement in the specification: a non-finite input renders as
 * an em dash rather than leaking "NaN%" into the UI.
 *
 * Currency is USD for the MVP because the portfolio source is US securities.
 * The currency code is a parameter so it can become a setting later.
 */
export const PLACEHOLDER = "—";

const DEFAULT_CURRENCY = "USD";
const DEFAULT_LOCALE = "en-US";

function isRenderable(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function formatMoney(
  value: number | null | undefined,
  currency: string = DEFAULT_CURRENCY,
): string {
  if (!isRenderable(value)) {
    return PLACEHOLDER;
  }

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Money with an explicit sign, for deltas between snapshots. */
export function formatMoneyChange(
  value: number | null | undefined,
  currency: string = DEFAULT_CURRENCY,
): string {
  if (!isRenderable(value)) {
    return PLACEHOLDER;
  }

  const formatted = formatMoney(Math.abs(value), currency);

  return value < 0 ? `-${formatted}` : `+${formatted}`;
}

export function formatPercentage(
  value: number | null | undefined,
  fractionDigits = 2,
): string {
  if (!isRenderable(value)) {
    return PLACEHOLDER;
  }

  const formatted = new Intl.NumberFormat(DEFAULT_LOCALE, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Math.abs(value));

  const sign = value < 0 ? "-" : "+";

  return `${sign}${formatted}%`;
}

export function formatQuantity(value: number | null | undefined): string {
  if (!isRenderable(value)) {
    return PLACEHOLDER;
  }

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    maximumFractionDigits: 4,
  }).format(value);
}

/** Quantity with an explicit sign, for share changes between snapshots. */
export function formatQuantityChange(value: number | null | undefined): string {
  if (!isRenderable(value)) {
    return "";
  }

  return `${value > 0 ? "+" : value < 0 ? "-" : "±"}${formatQuantity(Math.abs(value))}`;
}

export type Signedness = "positive" | "negative" | "neutral";

/**
 * Financial meaning of a number, so components can pick a colour without
 * re-deriving the comparison. Colour alone never carries the meaning: callers
 * pair this with a sign or arrow.
 */
export function signednessOf(value: number | null | undefined): Signedness {
  if (!isRenderable(value) || value === 0) {
    return "neutral";
  }

  return value > 0 ? "positive" : "negative";
}
