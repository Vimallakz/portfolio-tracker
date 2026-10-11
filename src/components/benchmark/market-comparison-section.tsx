import { MarketComparisonCard } from "@/components/benchmark/market-comparison-card";
import {
  MarketComparisonNote,
  MarketStatTiles,
  MarketVerdict,
} from "@/components/benchmark/market-comparison-summary";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { HistoryPoint } from "@/lib/portfolio/analytics/dashboard";
import { buildMonthlyPerformance } from "@/lib/portfolio/analytics/monthly-performance";
import { compareMonths, compareSinceStart } from "@/lib/portfolio/benchmark/benchmark";
import { getBenchmarkPrices } from "@/lib/portfolio/benchmark/prices";

const NEEDS_A_SNAPSHOT = "Upload a snapshot to compare your portfolio with the S&P 500 and Nasdaq 100.";

async function loadComparison(history: HistoryPoint[]) {
  const first = history[0];

  if (!first) {
    return null;
  }

  const prices = await getBenchmarkPrices(first.snapshotDate);
  const sinceStart = compareSinceStart(history, prices);

  return sinceStart
    ? { sinceStart, months: compareMonths(buildMonthlyPerformance(history), prices), startDate: first.snapshotDate }
    : null;
}

/** Streams in behind Suspense, since index prices may be downloaded first. */
export async function MarketComparisonSection({ history }: { history: HistoryPoint[] }) {
  const comparison = await loadComparison(history);

  if (!comparison) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>You vs the market</CardTitle>
          <CardDescription>{NEEDS_A_SNAPSHOT}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <MarketComparisonCard {...comparison} />;
}

/** The since-start comparison as tiles only, for pages that already chart the portfolio. */
export async function MarketTilesSection({ history }: { history: HistoryPoint[] }) {
  const comparison = await loadComparison(history);

  if (!comparison) {
    return <p className="text-muted-foreground text-xs">{NEEDS_A_SNAPSHOT}</p>;
  }

  return (
    <div className="grid gap-3">
      <MarketVerdict period={comparison.sinceStart} />
      <MarketStatTiles period={comparison.sinceStart} />
      <MarketComparisonNote period={comparison.sinceStart} />
    </div>
  );
}

export function MarketTilesSkeleton() {
  return (
    <div className="grid gap-3" aria-busy="true">
      <Skeleton className="h-5 w-96 max-w-full" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    </div>
  );
}

export function MarketComparisonSkeleton() {
  return (
    <Card aria-busy="true">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-56" />
      </CardContent>
    </Card>
  );
}
