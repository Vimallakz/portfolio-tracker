import type { ReactNode } from "react";

import { SignedValue } from "@/components/shared/signed-value";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSnapshotDate } from "@/lib/format/date";
import { formatMoney, formatMoneyChange, formatPercentage, formatQuantity } from "@/lib/format/number";
import type { SecurityHistoryRow } from "@/lib/portfolio/securities/queries";

const weightFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border px-3 py-2.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{children}</dd>
    </div>
  );
}

type SecurityPositionCardProps = {
  position: SecurityHistoryRow | null;
  latestSnapshotDate: string | null;
  /** The most recent snapshot that held it, for a security no longer held. */
  lastHeld: SecurityHistoryRow | undefined;
};

export function SecurityPositionCard({ position, latestSnapshotDate, lastHeld }: SecurityPositionCardProps) {
  if (!position) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio position</CardTitle>
          <CardDescription>
            Not in your latest snapshot
            {latestSnapshotDate ? ` from ${formatSnapshotDate(latestSnapshotDate)}` : ""}.
            {lastHeld ? ` Last held on ${formatSnapshotDate(lastHeld.snapshotDate)}.` : ""}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio position</CardTitle>
        <CardDescription>As of {formatSnapshotDate(position.snapshotDate)}.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Quantity">{formatQuantity(position.quantity)}</Stat>
          <Stat label="Average buy price">{formatMoney(position.averageBuyPrice)}</Stat>
          <Stat label="Current price">{formatMoney(position.currentPrice)}</Stat>
          <Stat label="Portfolio weight">{weightFormat.format(position.weight)}%</Stat>
          <Stat label="Invested">{formatMoney(position.investedAmount)}</Stat>
          <Stat label="Current value">{formatMoney(position.currentValue)}</Stat>
          <Stat label="P&L">
            <SignedValue value={position.pnlAmount}>{formatMoneyChange(position.pnlAmount)}</SignedValue>
          </Stat>
          <Stat label="P&L %">
            <SignedValue value={position.pnlAmount}>{formatPercentage(position.pnlPercentage)}</SignedValue>
          </Stat>
        </dl>
      </CardContent>
    </Card>
  );
}
