import { Money } from "@/components/currency/money";
import { SignedValue } from "@/components/shared/signed-value";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSnapshotDate } from "@/lib/format/date";
import { formatPercentage } from "@/lib/format/number";
import type { SincePrevious } from "@/lib/portfolio/analytics/dashboard";
import { cn } from "@/lib/utils";

function StepRow({
  label,
  detail,
  children,
  emphasis = false,
}: {
  label: string;
  detail?: string;
  children: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 py-2 text-sm", emphasis && "font-semibold")}>
      <dt>
        <span className={emphasis ? undefined : "text-muted-foreground"}>{label}</span>
        {detail ? <span className="text-muted-foreground block text-xs font-normal">{detail}</span> : null}
      </dt>
      <dd className="text-right tabular-nums">{children}</dd>
    </div>
  );
}

const ACTIVITY = [
  { key: "newHoldings", label: "New", dot: "bg-positive" },
  { key: "increasedHoldings", label: "Added to", dot: "bg-chart-2" },
  { key: "reducedHoldings", label: "Trimmed", dot: "bg-amber-500" },
  { key: "removedHoldings", label: "Sold", dot: "bg-negative" },
] as const;

export function SincePreviousCard({
  change,
  emptyMessage = "Upload another snapshot to see what changed.",
}: {
  change: SincePrevious | null;
  emptyMessage?: string;
}) {
  if (!change) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Since previous snapshot</CardTitle>
          <CardDescription>{emptyMessage}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const from = formatSnapshotDate(change.previousSnapshotDate);
  const to = formatSnapshotDate(change.currentSnapshotDate);
  const withdrew = change.investedAmountChange < 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Since previous snapshot</CardTitle>
        <CardDescription>
          {from} → {to}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="bg-muted/50 rounded-xl border p-4">
          <p className="text-muted-foreground text-xs">Market return</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <SignedValue value={change.pnlAmountChange} className="text-2xl font-semibold tracking-tight tabular-nums">
              <Money value={change.pnlAmountChange} change />
            </SignedValue>
            {change.marketReturnPercentage !== null ? (
              <SignedValue value={change.pnlAmountChange} className="text-sm font-medium tabular-nums">
                {formatPercentage(change.marketReturnPercentage)}
              </SignedValue>
            ) : null}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Gain or loss on your holdings. New money is not counted as profit.
          </p>
        </div>

        <dl className="divide-y">
          <StepRow label={`Value on ${from}`}>
            <Money value={change.previousValue} />
          </StepRow>
          <StepRow label={withdrew ? "Money withdrawn" : "New money invested"}>
            <Money value={change.investedAmountChange} change />
          </StepRow>
          <StepRow label="Market gain / loss">
            <SignedValue value={change.pnlAmountChange}>
              <Money value={change.pnlAmountChange} change />
            </SignedValue>
          </StepRow>
          <StepRow label={`Value on ${to}`} emphasis>
            <Money value={change.currentValue} />
          </StepRow>
          <StepRow label="Total profit / loss">
            <SignedValue value={change.previousPnlAmount}>
              <Money value={change.previousPnlAmount} change />
            </SignedValue>
            <span className="text-muted-foreground"> → </span>
            <SignedValue value={change.currentPnlAmount}>
              <Money value={change.currentPnlAmount} change />
            </SignedValue>
          </StepRow>
        </dl>

        <div className="grid gap-2">
          <p className="text-muted-foreground text-xs">Holdings activity</p>
          <dl className="grid grid-cols-4 gap-2">
            {ACTIVITY.map((item) => (
              <div key={item.key} className="flex flex-col-reverse rounded-lg border px-2 py-2 text-center">
                <dt className="text-muted-foreground flex items-center justify-center gap-1 text-xs">
                  <span aria-hidden="true" className={cn("size-1.5 rounded-full", item.dot)} />
                  {item.label}
                </dt>
                <dd className={cn("text-lg font-semibold tabular-nums", change[item.key] === 0 && "text-muted-foreground")}>
                  {change[item.key]}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="text-muted-foreground text-xs">
          The return % divides the market gain by the earlier value plus half the new money, as if it arrived mid-way.
        </p>
      </CardContent>
    </Card>
  );
}
