import { cache } from "react";

import { LivePrice } from "@/components/securities/live-price";
import { PriceTargetsCard } from "@/components/securities/price-targets-card";
import { SecurityLevelBadges, type SecurityLevels } from "@/components/securities/security-level-badges";
import { SecurityNewsCard } from "@/components/securities/security-news-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnalystData } from "@/lib/market-data/analyst-cache";
import { fetchCompanyNews, fetchQuote, isFinnhubEnabled } from "@/lib/market-data/finnhub";
import { listProfileSignals } from "@/lib/portfolio/signals/queries";

type SecurityRef = { id: string; ticker: string | null };

/** The header badges and the price targets card both need it; one live quote per request. */
const getSecuritySignals = cache(
  async (profileId: string, securityId: string) =>
    (await listProfileSignals(profileId, { securityId })).entries[0] ?? null,
);

/**
 * Header badges judged against the live price, with research levels adjusted
 * for any split since they were entered. The snapshot-price version is the fallback.
 */
export async function LiveLevelBadges({
  profileId,
  securityId,
  levels,
}: {
  profileId: string;
  securityId: string;
  levels: SecurityLevels;
}) {
  const entry = await getSecuritySignals(profileId, securityId);

  if (!entry) {
    return <SecurityLevelBadges levels={levels} judged={null} />;
  }

  return (
    <SecurityLevelBadges
      levels={{
        myTarget: entry.myTarget,
        analystTarget: entry.analystTarget,
        stopPrice: entry.stopPrice,
        accumulationMin: entry.accumulationMin,
        accumulationMax: entry.accumulationMax,
      }}
      judged={{ price: entry.price, source: entry.priceSource, date: entry.priceDate }}
    />
  );
}

/** Renders nothing without a quote. */
export async function LivePriceSection({ ticker }: { ticker: string | null }) {
  if (!ticker || !isFinnhubEnabled()) return null;

  const quote = await fetchQuote(ticker);

  return quote ? <LivePrice quote={quote} /> : null;
}

/** Fetches market data, so it streams in behind a Suspense boundary. */
export async function PriceTargetsSection({ profileId, security }: { profileId: string; security: SecurityRef }) {
  const [entry, analyst] = await Promise.all([
    getSecuritySignals(profileId, security.id),
    getAnalystData([security], { refreshLimit: 1 }),
  ]);
  const ratings = analyst.get(security.id);

  return (
    <PriceTargetsCard
      securityId={security.id}
      hasTicker={Boolean(security.ticker)}
      entry={entry}
      ratings={ratings?.ratings ?? null}
      ratingsFetchedAt={ratings?.fetchedAt ?? null}
      ratingsFeed={isFinnhubEnabled()}
    />
  );
}

export async function NewsSection({ ticker }: { ticker: string | null }) {
  if (!ticker) return <SecurityNewsCard state="no-ticker" />;
  if (!isFinnhubEnabled()) return <SecurityNewsCard state="no-key" />;

  return <SecurityNewsCard state="ok" news={await fetchCompanyNews(ticker)} />;
}

export function LivePriceSkeleton() {
  return <Skeleton aria-busy="true" className="h-5 w-48 self-center" />;
}

export function MarketCardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card aria-busy="true">
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="grid gap-3">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </CardContent>
    </Card>
  );
}
