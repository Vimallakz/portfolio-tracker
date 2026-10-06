import { SignedValue } from "@/components/shared/signed-value";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSnapshotDate } from "@/lib/format/date";
import { formatMoneyChange, formatPercentage } from "@/lib/format/number";
import type { SincePrevious } from "@/lib/portfolio/analytics/dashboard";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{children}</dd>
    </div>
  );
}

function count(value: number, sign: "+" | "-") {
  return value === 0 ? "0" : `${sign}${value}`;
}

export function SincePreviousCard({ change }: { change: SincePrevious | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Since previous snapshot</CardTitle>
        <CardDescription>
          {change
            ? `Compared with ${formatSnapshotDate(change.previousSnapshotDate)}.`
            : "Upload another snapshot to see what changed."}
        </CardDescription>
      </CardHeader>
      {change ? (
        <CardContent>
          <dl className="divide-y">
            <Row label="Value change">
              <SignedValue value={change.currentValueChange}>
                {formatMoneyChange(change.currentValueChange)} ({formatPercentage(change.currentValueChangePercentage)})
              </SignedValue>
            </Row>
            <Row label="Invested change">{formatMoneyChange(change.investedAmountChange)}</Row>
            <Row label="P&L change">
              <SignedValue value={change.pnlAmountChange}>{formatMoneyChange(change.pnlAmountChange)}</SignedValue>
            </Row>
            <Row label="New holdings">{count(change.newHoldings, "+")}</Row>
            <Row label="Removed">{count(change.removedHoldings, "-")}</Row>
            <Row label="Increased">{change.increasedHoldings}</Row>
            <Row label="Reduced">{change.reducedHoldings}</Row>
          </dl>
          <p className="text-muted-foreground mt-2 text-xs">
            Value change includes money added or withdrawn, so it is not a market return.
          </p>
        </CardContent>
      ) : null}
    </Card>
  );
}
