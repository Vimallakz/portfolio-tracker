export const DISPLAY_CURRENCIES = ["USD", "INR"] as const;

export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

export const DISPLAY_CURRENCY_COOKIE = "pit_display_currency";

export type RateSource = "MARKET" | "MANUAL";

/** INR per 1 USD. `date` is the market rate's publication date, null for a manual rate. */
export type UsdInrRate = { rate: number; date: string | null; source: RateSource };

export function parseDisplayCurrency(value: string | undefined): DisplayCurrency {
  return value === "INR" ? "INR" : "USD";
}

/** All stored amounts are USD; conversion happens only for display. */
export function convertFromUsd(value: number, currency: DisplayCurrency, rate: UsdInrRate | null): number {
  return currency === "INR" && rate ? value * rate.rate : value;
}
