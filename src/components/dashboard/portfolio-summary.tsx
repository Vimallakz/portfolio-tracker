import { SignedValue } from "@/components/shared/signed-value";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney, formatMoneyChange, formatPercentage } from "@/lib/format/number";
import type { PortfolioSummary as PortfolioSummaryData } from "@/lib/portfolio/analytics/dashboard";

function SummaryStat({ label, children, detail }: { label: string; children: React.ReactNode; detail?: React.ReactNode }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{children}</p>
        {detail ? <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}

export function PortfolioSummary({ summary }: { summary: PortfolioSummaryData }) {
  return (
    <section aria-label="Portfolio summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <SummaryStat label="Invested">{formatMoney(summary.investedAmount)}</SummaryStat>
      <SummaryStat label="Current value">{formatMoney(summary.currentValue)}</SummaryStat>
      <SummaryStat
        label="Portfolio return"
        detail={
          <SignedValue value={summary.pnlAmount}>{formatPercentage(summary.pnlPercentage)} on invested</SignedValue>
        }
      >
        <SignedValue value={summary.pnlAmount}>{formatMoneyChange(summary.pnlAmount)}</SignedValue>
      </SummaryStat>
      <SummaryStat
        label="Holdings"
        detail={`${summary.stockCount} ${summary.stockCount === 1 ? "stock" : "stocks"} · ${summary.etfCount} ${summary.etfCount === 1 ? "ETF" : "ETFs"}`}
      >
        {summary.holdingCount}
      </SummaryStat>
    </section>
  );
}
