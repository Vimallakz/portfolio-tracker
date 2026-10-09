import { z } from "zod";

import { env } from "@/lib/env";

const BASE_URL = "https://finnhub.io/api/v1";
const NEWS_LIMIT = 6;
const NEWS_DAYS = 14;

export type NewsItem = {
  id: string;
  headline: string;
  source: string;
  url: string;
  summary: string | null;
  /** ISO timestamp. */
  publishedAt: string;
};

export type LiveQuote = {
  price: number;
  /** Percentage change from the previous close. */
  changePercent: number | null;
  /** ISO timestamp of the quote. */
  asOf: string;
};

const newsSchema = z.array(
  z.object({
    id: z.union([z.number(), z.string()]),
    headline: z.string(),
    source: z.string().catch(""),
    url: z.string(),
    summary: z.string().nullish(),
    datetime: z.number(),
  }),
);

/** Newest first, de-duplicated by headline, only http(s) links. Exported for tests. */
export function parseNews(json: unknown, limit = NEWS_LIMIT): NewsItem[] {
  const parsed = newsSchema.safeParse(json);

  if (!parsed.success) {
    return [];
  }

  const seen = new Set<string>();

  return parsed.data
    .filter((item) => item.headline.trim() && /^https?:\/\//.test(item.url))
    .sort((a, b) => b.datetime - a.datetime)
    .filter((item) => {
      const key = item.headline.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit)
    .map((item) => ({
      id: String(item.id),
      headline: item.headline.trim(),
      source: item.source,
      url: item.url,
      summary: item.summary?.trim() || null,
      publishedAt: new Date(item.datetime * 1000).toISOString(),
    }));
}

const quoteSchema = z.object({ c: z.number(), dp: z.number().nullable().optional(), t: z.number() });

/** Finnhub answers unknown symbols with zeros rather than an error. Exported for tests. */
export function parseQuote(json: unknown): LiveQuote | null {
  const parsed = quoteSchema.safeParse(json);

  if (!parsed.success || parsed.data.c <= 0 || parsed.data.t <= 0) {
    return null;
  }

  return {
    price: parsed.data.c,
    changePercent: parsed.data.dp ?? null,
    asOf: new Date(parsed.data.t * 1000).toISOString(),
  };
}

export type AnalystRatings = {
  strongBuy: number | null;
  buy: number | null;
  hold: number | null;
  sell: number | null;
  strongSell: number | null;
};

export type RatingsFetchResult =
  | { status: "ok"; ratings: AnalystRatings }
  /** No analyst coverage for this ticker. Cache it anyway. */
  | { status: "empty" }
  /** Rate limit, network failure or a bad answer. Retry later. */
  | { status: "unavailable" };

const recommendationSchema = z.array(
  z.object({
    period: z.string(),
    strongBuy: z.number().nullish(),
    buy: z.number().nullish(),
    hold: z.number().nullish(),
    sell: z.number().nullish(),
    strongSell: z.number().nullish(),
  }),
);

/** The latest month of /stock/recommendation. Exported for tests. */
export function parseRecommendations(json: unknown): RatingsFetchResult {
  const parsed = recommendationSchema.safeParse(json);

  if (!parsed.success) {
    return { status: "unavailable" };
  }

  const latest = parsed.data.toSorted((a, b) => b.period.localeCompare(a.period))[0];

  if (!latest) {
    return { status: "empty" };
  }

  return {
    status: "ok",
    ratings: {
      strongBuy: latest.strongBuy ?? null,
      buy: latest.buy ?? null,
      hold: latest.hold ?? null,
      sell: latest.sell ?? null,
      strongSell: latest.strongSell ?? null,
    },
  };
}

export const isFinnhubEnabled = () => Boolean(env.FINNHUB_API_KEY);

/** Uncached: the caller stores the result in the database for a week. */
export async function fetchRecommendations(ticker: string): Promise<RatingsFetchResult> {
  const apiKey = env.FINNHUB_API_KEY;

  if (!apiKey) {
    return { status: "unavailable" };
  }

  const url = new URL(`${BASE_URL}/stock/recommendation`);
  url.searchParams.set("symbol", ticker);
  url.searchParams.set("token", apiKey);

  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    return response.ok ? parseRecommendations(await response.json()) : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

async function getJson(path: string, params: Record<string, string>, revalidateSeconds: number): Promise<unknown> {
  const apiKey = env.FINNHUB_API_KEY;

  if (!apiKey) {
    return null;
  }

  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("token", apiKey);

  try {
    const response = await fetch(url, { next: { revalidate: revalidateSeconds }, signal: AbortSignal.timeout(8000) });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

export async function fetchCompanyNews(ticker: string, now = new Date()): Promise<NewsItem[]> {
  const from = new Date(now.getTime() - NEWS_DAYS * 24 * 60 * 60 * 1000);
  return parseNews(await getJson("/company-news", { symbol: ticker, from: isoDay(from), to: isoDay(now) }, 60 * 60));
}

export async function fetchQuote(ticker: string): Promise<LiveQuote | null> {
  return parseQuote(await getJson("/quote", { symbol: ticker }, 15 * 60));
}

/** Live quotes for several tickers; missing or failed ones are left out. */
export async function fetchQuotes(tickers: string[]): Promise<Map<string, LiveQuote>> {
  const unique = [...new Set(tickers)];
  const quotes = await Promise.all(unique.map(async (ticker) => [ticker, await fetchQuote(ticker)] as const));
  return new Map(quotes.filter((entry): entry is [string, LiveQuote] => entry[1] !== null));
}
