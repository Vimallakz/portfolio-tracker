import { isValidTicker, normalizeTicker } from "@/lib/portfolio/securities/ticker";

export type TickerChoicesResult = { ok: true; tickers: Map<string, string> } | { ok: false; error: string };

/**
 * Tickers typed into the import preview, keyed by preview holding key. Blank
 * entries are dropped; the rest must be valid symbols, used at most once.
 */
export function parseTickerChoices(raw: Record<string, string>): TickerChoicesResult {
  const tickers = new Map<string, string>();
  const keyByTicker = new Map<string, string>();

  for (const [key, value] of Object.entries(raw)) {
    if (value.trim() === "") {
      continue;
    }

    const ticker = normalizeTicker(value);

    if (!isValidTicker(ticker)) {
      return { ok: false, error: `“${value.trim()}” is not a valid ticker. Use letters and digits only, like GRAB or BRK.B.` };
    }

    if (keyByTicker.has(ticker)) {
      return { ok: false, error: `${ticker} is entered for more than one security.` };
    }

    keyByTicker.set(ticker, key);
    tickers.set(key, ticker);
  }

  return { ok: true, tickers };
}
