import { Suspense, type ReactNode } from "react";

import { MarketPillsSection } from "@/components/benchmark/market-comparison-section";
import { formatMonthLabel } from "@/components/benchmark/market-comparison-summary";
import { Money } from "@/components/currency/money";
import { SignedValue } from "@/components/shared/signed-value";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercentage } from "@/lib/format/number";
import type { AllocationSlice, HistoryPoint, PortfolioSummary } from "@/lib/portfolio/analytics/dashboard";
import { buildMonthlyPerformance } from "@/lib/portfolio/analytics/monthly-performance";

const ALLOCATION_LABEL = { STOCK: "Stocks", ETF: "ETFs" } as const;
const ALLOCATION_COLOR = { STOCK: "bg-primary", ETF: "bg-chart-2" } as const;

const percent = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function HeroStat({ label, children, detail }: { label: string; children: ReactNode; detail?: ReactNode }) {
  return (
    <div className="bg-card grid content-start gap-1 px-4 py-3">
      <dt className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">{label}</dt>
      <dd className="text-lg font-semibold tracking-tight tabular-nums">{children}</dd>
      {detail ? <dd className="text-muted-foreground text-xs tabular-nums">{detail}</dd> : null}
    </div>
  );
}

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

  return (
    <section
      aria-label="Portfolio summary"
      className="bg-card light:shadow-surface overflow-hidden rounded-2xl ring-1 ring-foreground/10 light:ring-foreground/[0.08]"
    >
      <div className="from-primary/10 via-primary/5 grid gap-6 bg-gradient-to-br to-transparent p-5 sm:p-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
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
          <div className="grid gap-1.5">
            {firstMonth ? (
              <p className="text-muted-foreground text-xs">Against the market since {formatMonthLabel(firstMonth)}</p>
            ) : null}
            <Suspense fallback={<Skeleton className="h-6 w-80 max-w-full rounded-full" />}>
              <MarketPillsSection history={history} />
            </Suspense>
          </div>
        </div>

        <dl className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-xl border">
          <HeroStat label="Invested">
            <Money value={summary.investedAmount} />
          </HeroStat>
          <HeroStat
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
          </HeroStat>
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
        </dl>
      </div>
    </section>
  );
}
