import type { ReactNode } from "react";

import {
  MarketComparisonNote,
  MarketPills,
  MarketStatTiles,
  MonthlyMarketTable,
} from "@/components/benchmark/market-comparison-summary";
import { Money } from "@/components/currency/money";
import { ReportBridgeChart, ReportCurrency, ReportValueChart } from "@/components/reports/report-charts";
import { SignedValue } from "@/components/shared/signed-value";
import { YearlyReturn } from "@/components/shared/yearly-return";
import { formatSnapshotDate } from "@/lib/format/date";
import { formatPercentage } from "@/lib/format/number";
import type { MoneyWeightedReturn } from "@/lib/portfolio/analytics/xirr";
import type { MarketPeriod } from "@/lib/portfolio/benchmark/benchmark";
import type { PortfolioReport } from "@/lib/portfolio/reports/report";

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 break-inside-avoid">
      <div className="grid gap-0.5">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, children, detail }: { label: string; children: ReactNode; detail?: ReactNode }) {
  return (
    <div className="bg-card grid content-start gap-1 px-4 py-3">
      <dt className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">{label}</dt>
      <dd className="text-lg font-semibold tracking-tight tabular-nums">{children}</dd>
      {detail ? <dd className="text-muted-foreground text-xs">{detail}</dd> : null}
    </div>
  );
}

export function ReportDocument({
  report,
  market,
  yearly,
  profileName,
  generatedOn,
}: {
  report: PortfolioReport;
  /** Null when there is no report for the period. */
  market: { period: MarketPeriod; months: MarketPeriod[] } | null;
  /** XIRR from the first snapshot to the report's end. */
  yearly: MoneyWeightedReturn | null;
  profileName: string;
  /** "YYYY-MM-DD". */
  generatedOn: string;
}) {
  const startLabel = report.startDate ? formatSnapshotDate(report.startDate) : "start";
  const endLabel = formatSnapshotDate(report.endDate);
  const withdrew = report.moneyInvested < 0;
  const lost = report.marketGain < 0;

  return (
    <article className="bg-card mx-auto grid w-full max-w-[760px] gap-10 overflow-hidden rounded-2xl border shadow-sm print:max-w-none print:gap-8 print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
      <header className="from-primary/10 via-primary/5 grid gap-6 bg-gradient-to-br to-transparent px-6 pt-7 pb-6 sm:px-8 print:px-0 print:[print-color-adjust:exact]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <p className="text-primary text-[11px] font-semibold tracking-[0.14em] uppercase">Portfolio report</p>
            <h2 className="text-3xl font-semibold tracking-tight">{report.period.label}</h2>
            <p className="text-muted-foreground text-sm">
              {profileName} · {report.startDate ? `${startLabel} → ${endLabel}` : `Start of month → ${endLabel}`}
            </p>
          </div>
          <p className="bg-background/70 text-muted-foreground rounded-full border px-3 py-1 text-xs">
            <ReportCurrency /> · Generated {formatSnapshotDate(generatedOn)}
          </p>
        </div>

        <div className="grid gap-3">
          <p className="text-muted-foreground text-xs font-medium">Your return this period</p>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p className="text-5xl font-semibold tracking-tight tabular-nums">
              <SignedValue value={report.marketGain}>{formatPercentage(report.periodReturn)}</SignedValue>
            </p>
            <p className="text-sm tabular-nums">
              <SignedValue value={report.marketGain} className="font-medium">
                <Money value={report.marketGain} change />
              </SignedValue>{" "}
              <span className="text-muted-foreground">
                market {lost ? "loss" : "gain"}
                {report.moneyAtWork !== null ? (
                  <>
                    {" "}
                    on <Money value={report.moneyAtWork} /> at work
                  </>
                ) : null}
              </span>
            </p>
          </div>
          {market ? <MarketPills period={market.period} /> : null}
        </div>

        {report.isPartial ? (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            The latest snapshot in this period is from {endLabel}, so the report covers the period only up to that date.
          </p>
        ) : null}
      </header>

      <div className="grid gap-10 px-6 pb-8 sm:px-8 print:gap-8 print:px-0 print:pb-0">
        <Section
          title="Where the money came from"
          description="Your value at the start, plus the money you put in, plus what the market did with it."
        >
          <dl className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-xl border sm:grid-cols-4 print:grid-cols-4">
            <Stat label={report.startDate ? `Value ${startLabel}` : "Value at start"}>
              <Money value={report.startValue} />
            </Stat>
            <Stat label={withdrew ? "Money withdrawn" : "Money added"}>
              <Money value={report.moneyInvested} change />
            </Stat>
            <Stat label={lost ? "Market loss" : "Market gain"} detail="Price moves only, not new money">
              <SignedValue value={report.marketGain}>
                <Money value={report.marketGain} change />
              </SignedValue>
            </Stat>
            <Stat label={`Value ${endLabel}`}>
              <Money value={report.endValue} />
            </Stat>
          </dl>
          <ReportBridgeChart
            startValue={report.startValue}
            moneyInvested={report.moneyInvested}
            marketGain={report.marketGain}
            endValue={report.endValue}
            startDate={report.startDate}
            endDate={report.endDate}
          />
          <div className="bg-muted/40 flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-dashed px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              All-time return as of {endLabel}
              <span className="block text-xs">Everything invested so far, not only this period</span>
            </span>
            <span className="tabular-nums">
              <SignedValue value={report.endPnl} className="font-semibold">
                {formatPercentage(report.returnOnInvested)}
              </SignedValue>{" "}
              <span className="text-muted-foreground text-xs">
                <SignedValue value={report.endPnl}>
                  <Money value={report.endPnl} change />
                </SignedValue>{" "}
                on <Money value={report.endInvested} />
              </span>
              {yearly ? <YearlyReturn result={yearly} className="block text-right text-xs" /> : null}
            </span>
          </div>
        </Section>

        {market ? (
          <Section
            title="Against the market"
            description="The S&P 500 and Nasdaq 100 bought at the last close of the month before and held to the last close of the month."
          >
            <MarketStatTiles period={market.period} />
            {market.months.length > 1 ? <MonthlyMarketTable months={market.months} /> : null}
            <MarketComparisonNote period={market.period} />
          </Section>
        ) : null}

        {report.valueSeries.length > 2 ? (
          <Section title="Value vs invested" description="Portfolio value and money invested at each snapshot in the period.">
            <ReportValueChart series={report.valueSeries} />
          </Section>
        ) : null}

        <footer className="text-muted-foreground grid gap-1 border-t pt-4 text-xs">
          <p>
            Measured from the last snapshot before the period to the last one inside it.
            {report.startDate ? "" : " The period holds the first snapshot, so its money counts as invested at the start of that month."}
          </p>
          <p>
            Your return is the market gain divided by the money at work: the starting value plus the money added, as if
            it all went in at the start, the same way the indexes are measured.
          </p>
        </footer>
      </div>
    </article>
  );
}
