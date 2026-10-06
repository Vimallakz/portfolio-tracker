import { SignedValue } from "@/components/shared/signed-value";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatSnapshotDate } from "@/lib/format/date";
import { formatMoney, formatMoneyChange, formatPercentage } from "@/lib/format/number";
import type { ComparisonSummary } from "@/lib/portfolio/comparison/snapshot-comparator";
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

export function ComparisonSummaryCard({ fromDate, toDate, before, after, summary }: ComparisonSummaryCardProps) {
  const rows = [
    {
      label: "Current value",
      before: formatMoney(before.currentValue),
      after: formatMoney(after.currentValue),
      change: after.currentValue - before.currentValue,
      formatChange: formatMoneyChange,
    },
    {
      label: "Invested",
      before: formatMoney(before.investedAmount),
      after: formatMoney(after.investedAmount),
      change: after.investedAmount - before.investedAmount,
      formatChange: formatMoneyChange,
      neutral: true,
    },
    {
      label: "P&L",
      before: formatMoneyChange(before.pnlAmount),
      after: formatMoneyChange(after.pnlAmount),
      change: after.pnlAmount - before.pnlAmount,
      formatChange: formatMoneyChange,
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

  const counts = [
    { label: "New", value: summary.new },
    { label: "Removed", value: summary.removed },
    { label: "Increased", value: summary.increased },
    { label: "Reduced", value: summary.reduced },
    { label: "Unchanged", value: summary.unchanged },
  ];

  return (
    <Card className="pb-0">
      <CardHeader>
        <CardTitle>Portfolio change</CardTitle>
        <CardDescription>
          {formatSnapshotDate(fromDate)} → {formatSnapshotDate(toDate)}. Value change includes money added or withdrawn,
          so it is not a market return.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {counts.map((c) => (
            <div key={c.label} className="rounded-lg border px-3 py-2">
              <dt className="text-muted-foreground text-xs">{c.label}</dt>
              <dd className="text-lg font-semibold tabular-nums">{c.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
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
    </Card>
  );
}
