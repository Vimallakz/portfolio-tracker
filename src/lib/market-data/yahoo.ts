import { z } from "zod";

/** Yahoo Finance's public chart endpoint. No key, but unofficial, so every failure is handled. */
const CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const TIMEOUT_MS = 10_000;

export type DailyClose = {
  /** "YYYY-MM-DD", the trading day. */
  date: string;
  /** Dividend- and split-adjusted close. */
  close: number;
};

const chartSchema = z.object({
  chart: z.object({
    result: z
      .array(
        z.object({
          timestamp: z.array(z.number()).optional(),
          indicators: z.object({
            adjclose: z.array(z.object({ adjclose: z.array(z.number().nullable()) })).optional(),
            quote: z.array(z.object({ close: z.array(z.number().nullable()) })).optional(),
          }),
        }),
      )
      .nullable(),
  }),
});

/**
 * Adjusted closes in date order, skipping days without one. Falls back to the
 * plain close when Yahoo omits adjusted ones. Exported for tests.
 */
export function parseDailyCloses(json: unknown): DailyClose[] {
  const parsed = chartSchema.safeParse(json);
  const result = parsed.success ? parsed.data.chart.result?.[0] : undefined;

  if (!result?.timestamp) {
    return [];
  }

  const closes = result.indicators.adjclose?.[0]?.adjclose ?? result.indicators.quote?.[0]?.close ?? [];
  const byDate = new Map<string, number>();

  result.timestamp.forEach((timestamp, index) => {
    const close = closes[index];

    if (typeof close === "number" && close > 0) {
      // Timestamps mark the US session open, so the UTC date is the trading day.
      byDate.set(new Date(timestamp * 1000).toISOString().slice(0, 10), close);
    }
  });

  return [...byDate].map(([date, close]) => ({ date, close })).sort((a, b) => a.date.localeCompare(b.date));
}

export type StockSplit = {
  /** "YYYY-MM-DD", the first trading day at the new share count. */
  date: string;
  /** New shares per old share: 3 for a 3-for-1 split, 0.1 for a 1-for-10 reverse split. */
  ratio: number;
};

const splitsSchema = z.object({
  chart: z.object({
    result: z
      .array(
        z.object({
          events: z
            .object({
              splits: z
                .record(z.string(), z.object({ date: z.number(), numerator: z.number(), denominator: z.number() }))
                .optional(),
            })
            .optional(),
        }),
      )
      .nullable(),
  }),
});

/** Splits in date order, skipping malformed ones. Exported for tests. */
export function parseSplits(json: unknown): StockSplit[] {
  const parsed = splitsSchema.safeParse(json);
  const splits = parsed.success ? parsed.data.chart.result?.[0]?.events?.splits : undefined;

  return Object.values(splits ?? {})
    .filter((split) => split.numerator > 0 && split.denominator > 0 && split.numerator !== split.denominator)
    .map((split) => ({
      date: new Date(split.date * 1000).toISOString().slice(0, 10),
      ratio: split.numerator / split.denominator,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Splits in the last five years, cached for 12 hours; empty when Yahoo does not answer. */
export async function fetchSplits(symbol: string): Promise<StockSplit[]> {
  // A fixed range keeps the URL stable, so the cache is reused.
  const url = `${CHART_URL}/${encodeURIComponent(symbol)}?range=5y&interval=1mo&events=split`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 12 * 60 * 60 },
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PortfolioIntelligence/1.0)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    return response.ok ? parseSplits(await response.json()) : [];
  } catch {
    return [];
  }
}

/** Daily adjusted closes from `fromDate` ("YYYY-MM-DD") to now, or null when Yahoo does not answer usefully. */
export async function fetchDailyCloses(symbol: string, fromDate: string): Promise<DailyClose[] | null> {
  const period1 = Math.floor(Date.parse(`${fromDate}T00:00:00Z`) / 1000);
  const period2 = Math.floor(Date.now() / 1000);
  const url = `${CHART_URL}/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d&events=div%2Csplit`;

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PortfolioIntelligence/1.0)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      return null;
    }

    const closes = parseDailyCloses(await response.json());
    return closes.length > 0 ? closes : null;
  } catch {
    return null;
  }
}
