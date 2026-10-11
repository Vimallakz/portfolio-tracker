import { Suspense } from "react";

import { MarketPillsSection } from "@/components/benchmark/market-comparison-section";
import { formatMonthLabel } from "@/components/benchmark/market-comparison-summary";
import { Money } from "@/components/currency/money";
import { HeroCard } from "@/components/shared/hero-card";
import { SignedValue } from "@/components/shared/signed-value";
import { Stat, StatStrip } from "@/components/shared/stat-strip";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercentage } from "@/lib/format/number";
import type { HistoryPoint } from "@/lib/portfolio/analytics/dashboard";
import { addMonths } from "@/lib/portfolio/analytics/monthly-performance";
import type { YourPeriodReturn } from "@/lib/portfolio/benchmark/benchmark";
import { annualizeMonthlyReturn } from "@/lib/portfolio/planner/earnings";
import type { Projection } from "@/lib/portfolio/planner/projection";

/** "Where am I heading?" in one card: the default plan's result, the pace behind it and the market. */
export function PlannerHero({
  years,
  projection,
  contribution,
  contributionSource,
  monthlyReturn,
  returnSource,
  investedAmount,
  sinceStart,
  history,
}: {
  years: number;
  projection: Projection;
  contribution: number;
  contributionSource: string;
  /** Monthly return the projection uses, 0–100 scale. */
  monthlyReturn: number;
  returnSource: string;
  investedAmount: number;
  sinceStart: YourPeriodReturn | null;
  history: HistoryPoint[];
}) {
  const startMonth = sinceStart ? addMonths(sinceStart.fromMonth, 1) : null;
  const yearEnds = projection.points.filter((point) => point.month > 0 && point.month % 12 === 0);

  return (
    <HeroCard label="Plan summary">
      <div className="grid gap-3">
        <p className="text-muted-foreground text-xs font-medium">In {years} years at your current pace</p>
        <p className="text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
          <Money value={projection.finalValue} />
        </p>
        <p className="text-sm tabular-nums">
          <SignedValue value={projection.totalProfit} className="font-semibold">
            <Money value={projection.totalProfit} change />
            {projection.absoluteReturn !== null ? ` (${formatPercentage(projection.absoluteReturn)})` : null}
          </SignedValue>{" "}
          <span className="text-muted-foreground">
            profit on <Money value={projection.finalInvested} /> invested
          </span>
        </p>
        <div className="grid gap-1.5">
          {startMonth ? (
            <p className="text-muted-foreground text-xs">Against the market since {formatMonthLabel(startMonth)}</p>
          ) : null}
          <Suspense fallback={<Skeleton className="h-6 w-80 max-w-full rounded-full" />}>
            <MarketPillsSection history={history} />
          </Suspense>
        </div>
      </div>

      <StatStrip className="lg:grid-cols-2">
        <Stat label="Investing" detail={`Per month · ${contributionSource}`}>
          <Money value={contribution} />
        </Stat>
        <Stat
          label="Earning"
          detail={`Per month · about ${formatPercentage(annualizeMonthlyReturn(monthlyReturn), 1)} a year`}
        >
          <SignedValue value={monthlyReturn}>{formatPercentage(monthlyReturn)}</SignedValue>
        </Stat>
        <Stat label="Invested so far" detail="Cost basis of current holdings">
          <Money value={investedAmount} />
        </Stat>
        <Stat
          label="Return since start"
          detail={
            sinceStart && startMonth ? (
              <SignedValue value={sinceStart.yourGain}>
                <Money value={sinceStart.yourGain} change /> since {formatMonthLabel(startMonth)}
              </SignedValue>
            ) : undefined
          }
        >
          {sinceStart?.yourReturn != null ? (
            <SignedValue value={sinceStart.yourReturn}>{formatPercentage(sinceStart.yourReturn)}</SignedValue>
          ) : (
            "—"
          )}
        </Stat>
      </StatStrip>

      <div className="grid gap-2 lg:col-span-2">
        <p className="text-sm tabular-nums">
          <span className="text-muted-foreground">On average each year you add</span>{" "}
          <span className="font-semibold">
            <Money value={projection.totalContributed / years} />
          </span>{" "}
          <span className="text-muted-foreground">and the market adds</span>{" "}
          <SignedValue value={projection.projectedGain} className="font-semibold">
            <Money value={projection.projectedGain / years} change />
          </SignedValue>
        </p>
        <StatStrip className="sm:grid-cols-3 lg:grid-cols-5">
          {yearEnds.map((point) => (
            <Stat
              key={point.month}
              label={`Year ${point.month / 12}`}
              detail={
                <>
                  <Money value={point.invested} /> invested ·{" "}
                  <SignedValue value={point.value - point.invested}>
                    <Money value={point.value - point.invested} change />
                  </SignedValue>
                </>
              }
            >
              <Money value={point.value} />
            </Stat>
          ))}
        </StatStrip>
      </div>

      <p className="text-muted-foreground text-xs lg:col-span-2">
        Assumes this investing and earning pace holds; earning is {returnSource}. Change the plan below to try other
        numbers.
      </p>
    </HeroCard>
  );
}
