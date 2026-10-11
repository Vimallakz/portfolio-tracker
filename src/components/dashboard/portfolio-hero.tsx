import { Suspense } from "react";

import { MarketPillsSection } from "@/components/benchmark/market-comparison-section";
import { formatMonthLabel } from "@/components/benchmark/market-comparison-summary";
import { Money } from "@/components/currency/money";
import { HeroCard } from "@/components/shared/hero-card";
import { SignedValue } from "@/components/shared/signed-value";
import { Stat, StatStrip } from "@/components/shared/stat-strip";
import { YearlyReturn } from "@/components/shared/yearly-return";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercentage } from "@/lib/format/number";
import type { AllocationSlice, HistoryPoint, PortfolioSummary } from "@/lib/portfolio/analytics/dashboard";
import { buildMonthlyPerformance } from "@/lib/portfolio/analytics/monthly-performance";
import { calculateMoneyWeightedReturn } from "@/lib/portfolio/analytics/xirr";

const ALLOCATION_LABEL = { STOCK: "Stocks", ETF: "ETFs" } as const;
const ALLOCATION_COLOR = { STOCK: "bg-primary", ETF: "bg-chart-2" } as const;

const percent = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function AllocationBar({ allocation }: { allocation: AllocationSlice[] }) {
  const shown = allocation.filter((slice) => slice.percentage > 0);

  if (shown.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-1.5">
      <div className="bg-muted flex h-1.5 overflow-hidden rounded-full" aria-hidden="true">
        {shown.map((slice) => (
          <div key={slice.type} className={ALLOCATION_COLOR[slice.type]} style={{ width: `${slice.percentage}%` }} />
        ))}
      </div>
      <p className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
        {shown.map((slice) => (
          <span key={slice.type} className="inline-flex items-center gap-1">
            <span aria-hidden="true" className={`size-1.5 rounded-full ${ALLOCATION_COLOR[slice.type]}`} />
            {ALLOCATION_LABEL[slice.type]} {percent.format(slice.percentage)}% ({slice.holdingCount})
          </span>
        ))}
      </p>
    </div>
  );
}

/** Everything that answers "how am I doing?" in one card: value, return, the market, last month and the mix. */
export function PortfolioHero({
  summary,
  allocation,
  history,
}: {
  summary: PortfolioSummary;
  /** Always the whole portfolio, regardless of the type filter. */
  allocation: AllocationSlice[];
  history: HistoryPoint[];
}) {
  const lastMonth = buildMonthlyPerformance(history)
    .filter((entry) => entry.gain !== null)
    .at(-1);
  const firstMonth = history[0]?.snapshotDate.slice(0, 7);
  const yearly = calculateMoneyWeightedReturn(history);

  return (
    <HeroCard label="Portfolio summary">
      <div className="grid gap-3">
        <p className="text-muted-foreground text-xs font-medium">Portfolio value</p>
        <p className="text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
          <Money value={summary.currentValue} />
        </p>
        <p className="text-sm tabular-nums">
          <SignedValue value={summary.pnlAmount} className="font-semibold">
            <Money value={summary.pnlAmount} change /> ({formatPercentage(summary.pnlPercentage)})
          </SignedValue>{" "}
          <span className="text-muted-foreground">
            total return on <Money value={summary.investedAmount} /> invested
          </span>
        </p>
        {yearly ? <YearlyReturn result={yearly} className="text-sm" /> : null}
        <div className="grid gap-1.5">
          {firstMonth ? (
            <p className="text-muted-foreground text-xs">Against the market since {formatMonthLabel(firstMonth)}</p>
          ) : null}
          <Suspense fallback={<Skeleton className="h-6 w-80 max-w-full rounded-full" />}>
            <MarketPillsSection history={history} />
          </Suspense>
        </div>
      </div>

      <StatStrip className="lg:grid-cols-2">
        <Stat label="Invested">
          <Money value={summary.investedAmount} />
        </Stat>
        <Stat
          label={lastMonth ? `${formatMonthLabel(lastMonth.month)} return` : "Last month"}
          detail={
            lastMonth ? (
              <SignedValue value={lastMonth.gain}>
                <Money value={lastMonth.gain} change /> market {lastMonth.gain! < 0 ? "loss" : "gain"}
              </SignedValue>
            ) : (
              "Needs a second month"
            )
          }
        >
          {lastMonth ? (
            <SignedValue value={lastMonth.gain}>{formatPercentage(lastMonth.returnPercentage)}</SignedValue>
          ) : (
            "—"
          )}
        </Stat>
        <div className="bg-card col-span-2 grid grid-cols-[auto_1fr] items-baseline gap-x-2 gap-y-2 px-4 py-3">
          <dt className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">Holdings</dt>
          <dd className="text-right text-sm tabular-nums">
            <span className="text-lg font-semibold">{summary.holdingCount}</span>{" "}
            <span className="text-muted-foreground text-xs">
              {summary.stockCount} {summary.stockCount === 1 ? "stock" : "stocks"} · {summary.etfCount}{" "}
              {summary.etfCount === 1 ? "ETF" : "ETFs"}
            </span>
          </dd>
          <dd className="col-span-2">
            <AllocationBar allocation={allocation} />
          </dd>
        </div>
      </StatStrip>
    </HeroCard>
  );
}
