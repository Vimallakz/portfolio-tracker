import { Money } from "@/components/currency/money";
import { ChangeCounts } from "@/components/history/change-filter";
import { HeroCard } from "@/components/shared/hero-card";
import { SignedValue } from "@/components/shared/signed-value";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatSnapshotDate } from "@/lib/format/date";
import { formatPercentage } from "@/lib/format/number";
import type { ComparisonSummary, HoldingChangeStatus } from "@/lib/portfolio/comparison/snapshot-comparator";
import type { SnapshotTotals } from "@/lib/portfolio/history/history";

type ComparisonSummaryCardProps = {
  fromDate: string;
  toDate: string;
  before: SnapshotTotals;
  after: SnapshotTotals;
  summary: ComparisonSummary;
};

function formatPointsChange(value: number): string {
  return `${value < 0 ? "-" : "+"}${Math.abs(value).toFixed(2)} pts`;
}

function formatCountChange(value: number): string {
  return value === 0 ? "0" : `${value > 0 ? "+" : "-"}${Math.abs(value)}`;
}

const moneyChange = (value: number) => <Money value={value} change />;

/** Splits the value change into money added and market gain, beside a then-and-now table of each figure. */
export function ComparisonSummaryCard({ fromDate, toDate, before, after, summary }: ComparisonSummaryCardProps) {
  const valueChange = after.currentValue - before.currentValue;
  const moneyAdded = after.investedAmount - before.investedAmount;
  const marketGain = after.pnlAmount - before.pnlAmount;
  const moneyAtWork = before.currentValue + moneyAdded;
  const marketReturn = moneyAtWork > 0 ? (marketGain / moneyAtWork) * 100 : null;

  const rows = [
    {
      label: "Current value",
      before: <Money value={before.currentValue} />,
      after: <Money value={after.currentValue} />,
      change: valueChange,
      formatChange: moneyChange,
    },
    {
      label: "Invested",
      before: <Money value={before.investedAmount} />,
      after: <Money value={after.investedAmount} />,
      change: moneyAdded,
      formatChange: moneyChange,
      neutral: true,
    },
    {
      label: "P&L",
      before: <Money value={before.pnlAmount} change />,
      after: <Money value={after.pnlAmount} change />,
      change: marketGain,
      formatChange: moneyChange,
    },
    {
      label: "P&L %",
      before: formatPercentage(before.pnlPercentage),
      after: formatPercentage(after.pnlPercentage),
      change: after.pnlPercentage - before.pnlPercentage,
      formatChange: formatPointsChange,
    },
    {
      label: "Holdings",
      before: String(before.holdingCount),
      after: String(after.holdingCount),
      change: after.holdingCount - before.holdingCount,
      formatChange: formatCountChange,
      neutral: true,
    },
  ];

  const counts: { status: HoldingChangeStatus; value: number }[] = [
    { status: "NEW", value: summary.new },
    { status: "INCREASED", value: summary.increased },
    { status: "REDUCED", value: summary.reduced },
    { status: "REMOVED", value: summary.removed },
    { status: "UNCHANGED", value: summary.unchanged },
  ];

  return (
    <HeroCard label="Portfolio change">
      <div className="grid gap-3">
        <p className="text-muted-foreground text-xs font-medium">
          {formatSnapshotDate(fromDate)} → {formatSnapshotDate(toDate)}
        </p>
        <p className="text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
          <SignedValue value={valueChange}>
            <Money value={valueChange} change />
          </SignedValue>
        </p>
        <p className="text-muted-foreground text-sm tabular-nums">
          Value went from <Money value={before.currentValue} /> to{" "}
          <span className="text-foreground font-medium">
            <Money value={after.currentValue} />
          </span>
        </p>

        <dl className="flex flex-wrap gap-2 text-xs tabular-nums">
          <div className="bg-background/60 flex items-center gap-1.5 rounded-full border px-3 py-1">
            <dt className="text-muted-foreground">Money added</dt>
            <dd className="font-semibold">
              <Money value={moneyAdded} change />
            </dd>
          </div>
          <div className="bg-background/60 flex items-center gap-1.5 rounded-full border px-3 py-1">
            <dt className="text-muted-foreground">Market {marketGain < 0 ? "loss" : "gain"}</dt>
            <dd className="font-semibold">
              <SignedValue value={marketGain}>
                <Money value={marketGain} change />
                {marketReturn !== null ? ` (${formatPercentage(marketReturn)})` : null}
              </SignedValue>
            </dd>
          </div>
        </dl>
        <p className="text-muted-foreground text-xs">
          The value change includes money added or withdrawn; the market gain leaves it out
          {marketReturn !== null ? <>, and its % is on the <Money value={moneyAtWork} /> at work</> : null}.
        </p>

        <ChangeCounts counts={counts} />
      </div>

      <div className="bg-card overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Metric</TableHead>
              <TableHead className="text-right">{formatSnapshotDate(fromDate)}</TableHead>
              <TableHead className="text-right">{formatSnapshotDate(toDate)}</TableHead>
              <TableHead className="pr-4 text-right">Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="text-muted-foreground pl-4">{row.label}</TableCell>
                <TableCell className="text-right tabular-nums">{row.before}</TableCell>
                <TableCell className="text-right tabular-nums">{row.after}</TableCell>
                <TableCell className="pr-4 text-right font-medium tabular-nums">
                  {row.neutral ? (
                    row.formatChange(row.change)
                  ) : (
                    <SignedValue value={row.change}>{row.formatChange(row.change)}</SignedValue>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </HeroCard>
  );
}
