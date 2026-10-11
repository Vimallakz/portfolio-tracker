import { Money } from "@/components/currency/money";
import { SignedValue } from "@/components/shared/signed-value";
import { formatPercentage } from "@/lib/format/number";
import { addMonths } from "@/lib/portfolio/analytics/monthly-performance";
import { BENCHMARKS, type IndexMove, type MarketPeriod } from "@/lib/portfolio/benchmark/benchmark";
import { cn } from "@/lib/utils";

export const PORTFOLIO_COLOR = "var(--chart-1)";

const colorOf = (symbol: string) => BENCHMARKS.find((benchmark) => benchmark.symbol === symbol)?.color ?? PORTFOLIO_COLOR;

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const monthLabel = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

const formatShortDate = (isoDate: string) => shortDate.format(new Date(`${isoDate}T00:00:00Z`));
export const formatMonthLabel = (month: string) => monthLabel.format(new Date(`${month}-01T00:00:00Z`));

const formatGap = (points: number) => `${Math.abs(points).toFixed(2)}%`;
const formatPrice = (value: number) => value.toFixed(2);

/** Your return minus the index's, in percentage points. Null without your return. */
const gapOf = (period: MarketPeriod, move: IndexMove) =>
  period.yourReturn === null ? null : period.yourReturn - move.change;

/** "You did better than the S&P 500 by 1.20% (+$5.40) and worse than the Nasdaq 100 by 0.80% (−$3.60)." */
export function MarketVerdict({ period }: { period: MarketPeriod }) {
  const comparable = period.indexes.filter((move) => gapOf(period, move) !== null);

  if (comparable.length === 0) {
    return null;
  }

  return (
    <p className="text-sm">
      {comparable.map((move, index) => {
        const gap = gapOf(period, move)!;
        const better = gap >= 0;

        return (
          <span key={move.symbol}>
            {index === 0 ? "You did " : index === comparable.length - 1 ? " and " : ", "}
            <SignedValue value={better ? 1 : -1} className="font-medium">
              {better ? "better" : "worse"} than the {move.label} by {formatGap(gap)}
              {move.gain !== null ? (
                <>
                  {" "}
                  (<Money value={period.yourGain - move.gain} change />)
                </>
              ) : null}
            </SignedValue>
          </span>
        );
      })}
      .
    </p>
  );
}

function Swatch({ color }: { color: string }) {
  return <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: color }} />;
}

/** One tile for your return, then one per index with its start and end close and the gap to you. */
export function MarketStatTiles({ period }: { period: MarketPeriod }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 print:grid-cols-3">
      <div className="bg-accent/40 border-primary/20 rounded-xl border p-4">
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Swatch color={PORTFOLIO_COLOR} />
          Your portfolio
        </p>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
          <SignedValue value={period.yourReturn}>{formatPercentage(period.yourReturn)}</SignedValue>
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
          <SignedValue value={period.yourGain}>
            <Money value={period.yourGain} change />
          </SignedValue>{" "}
          {period.yourGain < 0 ? "loss" : "gain"}
          {period.base !== null ? (
            <>
              {" "}
              on <Money value={period.base} /> at work
            </>
          ) : null}
        </p>
      </div>

      {period.indexes.map((move) => {
        const gap = gapOf(period, move);

        return (
          <div key={move.symbol} className="rounded-xl border p-4">
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Swatch color={colorOf(move.symbol)} />
              {move.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
              <SignedValue value={move.change}>{formatPercentage(move.change)}</SignedValue>
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
              {move.symbol} {formatPrice(move.fromClose)} ({formatShortDate(move.fromDate)}) →{" "}
              {formatPrice(move.toClose)} ({formatShortDate(move.toDate)})
            </p>
            {gap !== null ? (
              <p className="mt-2 text-xs font-medium tabular-nums">
                <SignedValue value={gap >= 0 ? 1 : -1}>
                  You did {gap >= 0 ? "better" : "worse"} by {formatGap(gap)}
                  {move.gain !== null ? (
                    <>
                      {" "}
                      (<Money value={period.yourGain - move.gain} change />)
                    </>
                  ) : null}
                </SignedValue>
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Month by month: your return against each index's month-end to month-end move. */
export function MonthlyMarketTable({ months }: { months: MarketPeriod[] }) {
  const symbols = BENCHMARKS.filter((benchmark) =>
    months.some((month) => month.indexes.some((move) => move.symbol === benchmark.symbol)),
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-xs">
            <th scope="col" className="py-2 pr-2 text-left font-medium">
              Month
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              You
            </th>
            {symbols.map((benchmark) => (
              <th key={benchmark.symbol} scope="col" className="px-2 py-2 text-right font-medium">
                {benchmark.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {months.map((month) => (
            <tr key={month.toMonth} className="border-b last:border-0">
              <th scope="row" className="py-2 pr-2 text-left font-normal whitespace-nowrap">
                {formatMonthLabel(month.toMonth)}
                {addMonths(month.fromMonth, 1) !== month.toMonth ? (
                  <span className="text-muted-foreground text-xs"> · since {formatMonthLabel(addMonths(month.fromMonth, 1))}</span>
                ) : null}
                {month.isMonthToDate ? <span className="text-muted-foreground text-xs"> · so far</span> : null}
              </th>
              <td className="px-2 py-2 text-right font-medium tabular-nums">
                <SignedValue value={month.yourReturn}>{formatPercentage(month.yourReturn)}</SignedValue>
              </td>
              {symbols.map((benchmark) => {
                const move = month.indexes.find((item) => item.symbol === benchmark.symbol);
                const gap = move ? gapOf(month, move) : null;

                return (
                  <td key={benchmark.symbol} className="px-2 py-2 text-right tabular-nums">
                    {move ? (
                      <>
                        <SignedValue value={move.change}>{formatPercentage(move.change)}</SignedValue>
                        {gap !== null ? (
                          <span className={cn("block text-[11px]", gap >= 0 ? "text-positive" : "text-negative")}>
                            you {gap >= 0 ? "+" : "-"}
                            {formatGap(gap)}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MarketComparisonNote({ period }: { period: MarketPeriod }) {
  return (
    <p className="text-muted-foreground text-xs">
      {period.indexes.length === 0
        ? "Index prices could not be loaded right now, so only your own return is shown. "
        : "Indexes are measured as if bought once at the last close of the month before and held to the last close of the month (SPY and QQQ, dividends included, prices from Yahoo Finance). "}
      Your return is the market gain over the money at work: the starting value plus the money added, as if it all
      went in at the start too.
      {period.isMonthToDate ? " The current month is still running, so its index figure is month to date." : ""}
    </p>
  );
}
