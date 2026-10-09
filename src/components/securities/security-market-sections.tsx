import { PriceTargetsCard } from "@/components/securities/price-targets-card";
import { SecurityNewsCard } from "@/components/securities/security-news-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnalystData } from "@/lib/market-data/analyst-cache";
import { fetchCompanyNews, isFinnhubEnabled } from "@/lib/market-data/finnhub";
import { listProfileSignals } from "@/lib/portfolio/signals/queries";

type SecurityRef = { id: string; ticker: string | null };

/** Fetches market data, so it streams in behind a Suspense boundary. */
export async function PriceTargetsSection({ profileId, security }: { profileId: string; security: SecurityRef }) {
  const [{ entries }, analyst] = await Promise.all([
    listProfileSignals(profileId, { securityId: security.id }),
    getAnalystData([security], { refreshLimit: 1 }),
  ]);
  const ratings = analyst.get(security.id);

  return (
    <PriceTargetsCard
      securityId={security.id}
      hasTicker={Boolean(security.ticker)}
      entry={entries[0] ?? null}
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
