import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Money } from "@/components/currency/money";
import { SignedValue } from "@/components/shared/signed-value";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSnapshotDate } from "@/lib/format/date";
import { formatPercentage } from "@/lib/format/number";
import type { SincePrevious } from "@/lib/portfolio/analytics/dashboard";
import { cn } from "@/lib/utils";

const ACTIVITY = [
  { key: "newHoldings", label: "new", dot: "bg-positive" },
  { key: "increasedHoldings", label: "added to", dot: "bg-chart-2" },
  { key: "reducedHoldings", label: "trimmed", dot: "bg-amber-500" },
  { key: "removedHoldings", label: "sold", dot: "bg-negative" },
] as const;

/** The dashboard's short version of the since-previous card: market gain, new money and holdings activity. */
export function SinceLastSnapshotCard({ change }: { change: SincePrevious | null }) {
  return (
    <Card size="sm" className="h-full">
      <CardHeader>
        <CardTitle>Since last snapshot</CardTitle>
        <CardDescription>
          {change
            ? `${formatSnapshotDate(change.previousSnapshotDate)} → ${formatSnapshotDate(change.currentSnapshotDate)}`
            : "Upload another snapshot to see what changed."}
        </CardDescription>
      </CardHeader>
      {change ? (
        <CardContent className="grid flex-1 content-between gap-3">
          <div className="grid gap-2">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <SignedValue value={change.pnlAmountChange} className="text-2xl font-semibold tracking-tight tabular-nums">
                <Money value={change.pnlAmountChange} change />
              </SignedValue>
              {change.marketReturnPercentage !== null ? (
                <SignedValue value={change.pnlAmountChange} className="text-sm font-medium tabular-nums">
                  {formatPercentage(change.marketReturnPercentage)}
                </SignedValue>
              ) : null}
            </p>
            <p className="text-muted-foreground text-xs">
              Market {change.pnlAmountChange < 0 ? "loss" : "gain"}, plus{" "}
              <span className="text-foreground font-medium tabular-nums">
                <Money value={change.investedAmountChange} change />
              </span>{" "}
              {change.investedAmountChange < 0 ? "withdrawn" : "new money"}
            </p>
            <ul className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="Holdings activity">
              {ACTIVITY.map((item) => (
                <li key={item.key} className={cn("inline-flex items-center gap-1", change[item.key] === 0 && "opacity-60")}>
                  <span aria-hidden="true" className={cn("size-1.5 rounded-full", item.dot)} />
                  <span className="text-foreground font-medium tabular-nums">{change[item.key]}</span> {item.label}
                </li>
              ))}
            </ul>
          </div>
          <Link
            href="/history"
            className="text-primary inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
          >
            Open history
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </CardContent>
      ) : null}
    </Card>
  );
}
