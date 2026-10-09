import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ env: {} }));

const { parseNews, parseQuote, parseRecommendations } = await import("@/lib/market-data/finnhub");

describe("parseRecommendations", () => {
  it("reads the latest month of ratings", () => {
    expect(
      parseRecommendations([
        { symbol: "HSY", period: "2026-08-01", strongBuy: 1, buy: 1, hold: 1, sell: 1, strongSell: 1 },
        { symbol: "HSY", period: "2026-09-01", strongBuy: 2, buy: 9, hold: 16, sell: 1, strongSell: 0 },
      ]),
    ).toEqual({ status: "ok", ratings: { strongBuy: 2, buy: 9, hold: 16, sell: 1, strongSell: 0 } });
  });

  it("reports no coverage as empty and errors as unavailable", () => {
    expect(parseRecommendations([])).toEqual({ status: "empty" });
    expect(parseRecommendations({ error: "You don't have access to this resource." })).toEqual({ status: "unavailable" });
  });
});

describe("parseNews", () => {
  const item = (id: number, headline: string, datetime: number, url = "https://example.com/a") => ({
    id,
    headline,
    source: "Reuters",
    url,
    summary: "",
    datetime,
    category: "company",
  });

  it("sorts newest first, drops duplicates and non-http links, and limits the count", () => {
    const news = parseNews(
      [
        item(1, "Old", 1_700_000_000),
        item(2, "New", 1_700_100_000),
        item(3, "new ", 1_700_050_000),
        item(4, "Bad link", 1_700_200_000, "javascript:alert(1)"),
        item(5, "Middle", 1_700_060_000),
      ],
      2,
    );

    expect(news.map((n) => n.headline)).toEqual(["New", "Middle"]);
    expect(news[0]).toMatchObject({ id: "2", source: "Reuters", summary: null, publishedAt: "2023-11-16T02:00:00.000Z" });
  });

  it("returns an empty list for an error payload", () => {
    expect(parseNews({ error: "API limit reached" })).toEqual([]);
  });
});

describe("parseQuote", () => {
  it("reads price and change", () => {
    expect(parseQuote({ c: 3.11, d: 0.03, dp: 1.13, h: 3.11, l: 3.02, o: 3.05, pc: 3.08, t: 1_791_000_000 })).toMatchObject({
      price: 3.11,
      changePercent: 1.13,
    });
  });

  it("treats Finnhub's all-zero answer for unknown symbols as no quote", () => {
    expect(parseQuote({ c: 0, d: null, dp: null, h: 0, l: 0, o: 0, pc: 0, t: 0 })).toBeNull();
  });
});
