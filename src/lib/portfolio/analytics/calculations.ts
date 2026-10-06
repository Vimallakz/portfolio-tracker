import Decimal from "decimal.js";

/**
 * Shared portfolio formulas. Every screen and the importer go through these so
 * a formula is never re-derived inside a component. Division by zero yields 0
 * rather than NaN or Infinity.
 */
export type DecimalInput = Decimal.Value;

const ZERO = new Decimal(0);

function safePercent(part: DecimalInput, whole: DecimalInput): Decimal {
  const divisor = new Decimal(whole);

  return divisor.isZero() ? ZERO : new Decimal(part).div(divisor).mul(100);
}

export function calculateInvestedAmount(
  quantity: DecimalInput,
  averageBuyPrice: DecimalInput,
): Decimal {
  return new Decimal(quantity).mul(averageBuyPrice);
}

export function calculateCurrentValue(
  quantity: DecimalInput,
  currentPrice: DecimalInput,
): Decimal {
  return new Decimal(quantity).mul(currentPrice);
}

/** P&L = Current Value − Invested Amount */
export function calculatePnl(
  currentValue: DecimalInput,
  investedAmount: DecimalInput,
): Decimal {
  return new Decimal(currentValue).sub(investedAmount);
}

/** P&L % = (Current Value − Invested Amount) / Invested Amount × 100 */
export function calculatePnlPercentage(
  currentValue: DecimalInput,
  investedAmount: DecimalInput,
): Decimal {
  return safePercent(calculatePnl(currentValue, investedAmount), investedAmount);
}

/** Share of the portfolio's total current value, 0–100. */
export function calculatePortfolioWeight(
  currentValue: DecimalInput,
  totalValue: DecimalInput,
): Decimal {
  return safePercent(currentValue, totalValue);
}

export function calculateChange(
  previous: DecimalInput,
  next: DecimalInput,
): Decimal {
  return new Decimal(next).sub(previous);
}

export function sumDecimals(values: DecimalInput[]): Decimal {
  return values.reduce<Decimal>((sum, value) => sum.add(value), ZERO);
}
