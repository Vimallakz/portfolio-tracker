import { prisma } from "@/lib/db/prisma";
import { type AnalystRatings, fetchRecommendations, isFinnhubEnabled } from "@/lib/market-data/finnhub";

const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
/** Ratings change monthly, so a page load refreshes only a few stale rows. */
const REFRESH_LIMIT_PER_REQUEST = 10;
/** After a failed answer, stop asking for a while instead of burning calls. */
const BACKOFF_MS = 15 * 60 * 1000;

let unavailableUntil = 0;

export type AnalystData = {
  ratings: AnalystRatings;
  /** ISO timestamp. */
  fetchedAt: string;
};

type SecurityRef = { id: string; ticker: string | null };

type StoredRow = Awaited<ReturnType<typeof prisma.securityAnalystData.findMany>>[number];

const toView = (row: StoredRow): AnalystData => ({
  ratings: { strongBuy: row.strongBuy, buy: row.buy, hold: row.hold, sell: row.sell, strongSell: row.strongSell },
  fetchedAt: row.fetchedAt.toISOString(),
});

const NO_RATINGS: AnalystRatings = { strongBuy: null, buy: null, hold: null, sell: null, strongSell: null };

async function refresh(security: SecurityRef & { ticker: string }): Promise<StoredRow | null> {
  const result = await fetchRecommendations(security.ticker);

  if (result.status === "unavailable") {
    unavailableUntil = Date.now() + BACKOFF_MS;
    return null;
  }

  const data = { ...(result.status === "ok" ? result.ratings : NO_RATINGS), fetchedAt: new Date() };

  return prisma.securityAnalystData.upsert({
    where: { securityId: security.id },
    create: { securityId: security.id, ...data },
    update: data,
  });
}

/**
 * Cached analyst ratings by security id. Rows older than a week are
 * refreshed, a few per call; the rest keep their older data until a later
 * page load. A failed refresh never throws.
 */
export async function getAnalystData(
  securities: SecurityRef[],
  { refreshLimit = REFRESH_LIMIT_PER_REQUEST }: { refreshLimit?: number } = {},
): Promise<Map<string, AnalystData>> {
  const ids = securities.map((security) => security.id);
  const rows = ids.length ? await prisma.securityAnalystData.findMany({ where: { securityId: { in: ids } } }) : [];
  const byId = new Map(rows.map((row) => [row.securityId, row]));

  if (isFinnhubEnabled() && Date.now() >= unavailableUntil) {
    const now = Date.now();
    const stale = securities
      .filter((security): security is SecurityRef & { ticker: string } => Boolean(security.ticker))
      .filter((security) => {
        const row = byId.get(security.id);
        return !row || now - row.fetchedAt.getTime() > STALE_AFTER_MS;
      })
      // Never-fetched first, then the oldest.
      .sort((a, b) => (byId.get(a.id)?.fetchedAt.getTime() ?? 0) - (byId.get(b.id)?.fetchedAt.getTime() ?? 0))
      .slice(0, refreshLimit);

    const refreshed = await Promise.all(stale.map(refresh));
    for (const row of refreshed) {
      if (row) byId.set(row.securityId, row);
    }
  }

  return new Map([...byId].map(([id, row]) => [id, toView(row)]));
}

/** Fetches one security now, ignoring the weekly cache. Used by the Refresh button. */
export async function refreshAnalystData(security: SecurityRef): Promise<"ok" | "unavailable" | "no-ticker"> {
  if (!security.ticker) {
    return "no-ticker";
  }

  const row = await refresh({ ...security, ticker: security.ticker });
  return row ? "ok" : "unavailable";
}
