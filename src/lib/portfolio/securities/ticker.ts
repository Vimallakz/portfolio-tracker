/**
 * US tickers are 1–10 characters: letters and digits, optionally with a single
 * "." or "-" class separator such as BRK.B or BF-B.
 */
const TICKER_PATTERN = /^[A-Z0-9]{1,8}(?:[.-][A-Z0-9]{1,4})?$/;

const TICKERTAPE_US_STOCKS_BASE = "https://www.tickertape.in/us-stocks/";

export function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

export function isValidTicker(ticker: string): boolean {
  return TICKER_PATTERN.test(normalizeTicker(ticker));
}

/**
 * Builds the Tickertape page URL from a validated ticker only, so no stored or
 * user-entered string can redirect the link elsewhere.
 */
export function getTickertapeUrl(ticker: string): string {
  const normalized = normalizeTicker(ticker);

  if (!TICKER_PATTERN.test(normalized)) {
    throw new Error("Cannot build a Tickertape URL from an invalid ticker.");
  }

  return `${TICKERTAPE_US_STOCKS_BASE}${encodeURIComponent(normalized)}`;
}
