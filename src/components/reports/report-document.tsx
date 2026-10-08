import type { ReactNode } from "react";

import { Money } from "@/components/currency/money";
import { ReportCurrency, ReportGainChart, ReportValueChart } from "@/components/reports/report-charts";
import { SignedValue } from "@/components/shared/signed-value";
import { formatSnapshotDate } from "@/lib/format/date";
import { formatPercentage } from "@/lib/format/number";
import type { PortfolioReport } from "@/lib/portfolio/reports/report";
import { cn } from "@/lib/utils";

function Kpi({ label, children, detail }: { label: string; children: ReactNode; detail?: ReactNode }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{children}</p>
      {detail ? <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">{detail}</p> : null}
    </div>
  );
}

function Step({ label, children, total = false }: { label: string; children: ReactNode; total?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-2.5 text-sm", total && "font-semibold")}>
      <dt className={total ? undefined : "text-muted-foreground"}>{label}</dt>
      <dd className="tabular-nums">{children}</dd>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 break-inside-avoid">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function ReportDocument({
  report,
  profileName,
  generatedOn,
}: {
  report: PortfolioReport;
  profileName: string;
  /** "YYYY-MM-DD". */
  generatedOn: string;
}) {
  const startLabel = report.startDate ? formatSnapshotDate(report.startDate) : "start";
  const endLabel = formatSnapshotDate(report.endDate);
  const withdrew = report.moneyInvested < 0;

  return (
    <article className="bg-card mx-auto grid w-full max-w-[760px] gap-8 rounded-xl border p-6 shadow-sm sm:p-8 print:max-w-none print:gap-6 print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <header className="grid gap-1 border-b pb-5">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Portfolio report</p>
        <h2 className="text-2xl font-semibold tracking-tight">{report.period.label}</h2>
        <p className="text-muted-foreground text-sm">
          {profileName} · {report.startDate ? `${startLabel} → ${endLabel}` : `First snapshot → ${endLabel}`} · Amounts in{" "}
          <ReportCurrency /> · Generated {formatSnapshotDate(generatedOn)}
        </p>
        {report.isPartial ? (
          <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            The latest snapshot in this period is from {endLabel}, so the report covers the period only up to that date.
          </p>
        ) : null}
      </header>

      <Section title="Summary">
        <div className="grid gap-3 sm:grid-cols-3 print:grid-cols-3">
          <Kpi
            label="Return for the period"
            detail={<SignedValue value={report.marketGain}>Market gain, excluding new money</SignedValue>}
          >
            <SignedValue value={report.marketGain}>{formatPercentage(report.periodReturn)}</SignedValue>
          </Kpi>
          <Kpi label="Market gain / loss" detail={`${startLabel} → ${endLabel}`}>
            <SignedValue value={report.marketGain}>
              <Money value={report.marketGain} change />
            </SignedValue>
          </Kpi>
          <Kpi
            label="Total return on invested"
            detail={
              <SignedValue value={report.endPnl}>
                <Money value={report.endPnl} change /> on <Money value={report.endInvested} />
              </SignedValue>
            }
          >
            <SignedValue value={report.endPnl}>{formatPercentage(report.returnOnInvested)}</SignedValue>
          </Kpi>
        </div>

        <dl className="divide-y rounded-xl border px-4">
          <Step label={report.startDate ? `Value on ${startLabel}` : "Value at start"}>
            <Money value={report.startValue} />
          </Step>
          <Step label={withdrew ? "Money withdrawn" : "Money invested"}>
            <Money value={report.moneyInvested} change />
          </Step>
          <Step label="Market gain / loss">
            <SignedValue value={report.marketGain}>
              <Money value={report.marketGain} change />
            </SignedValue>
          </Step>
          <Step label={`Value on ${endLabel}`} total>
            <Money value={report.endValue} />
          </Step>
        </dl>
      </Section>

      <Section title="Value vs invested" description="Portfolio value and money invested at each snapshot in the period.">
        <ReportValueChart series={report.valueSeries} />
      </Section>

      <Section title="Market gain by month" description="Gain or loss each month, excluding money added. Labels show the month's return.">
        <ReportGainChart months={report.monthly} />
      </Section>

      <footer className="text-muted-foreground grid gap-1 border-t pt-4 text-xs">
        <p>
          Measured from the last snapshot before the period to the last one inside it.
          {report.startDate ? "" : " The period holds the first snapshot, so it starts from zero as if investing began then."}
        </p>
        <p>
          Return for the period is the market gain divided by the starting value plus half the money invested, as if it
          arrived mid-period. Total return on invested is the profit or loss on everything invested at the end.
        </p>
      </footer>
    </article>
  );
}
