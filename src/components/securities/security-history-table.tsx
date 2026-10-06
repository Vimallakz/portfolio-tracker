import { SignedValue } from "@/components/shared/signed-value";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatSnapshotDate } from "@/lib/format/date";
import { formatMoney, formatMoneyChange, formatPercentage, formatQuantity } from "@/lib/format/number";
import type { SecurityHistoryRow } from "@/lib/portfolio/securities/queries";

function formatQuantityChange(change: number): string {
  return `${change > 0 ? "+" : "-"}${formatQuantity(Math.abs(change))}`;
}

/** Newest first, with the quantity change since the previous snapshot that held it. */
export function SecurityHistoryTable({ history }: { history: SecurityHistoryRow[] }) {
  const rows = history.map((row, i) => ({ row, quantityChange: i === 0 ? 0 : row.quantity - history[i - 1].quantity })).reverse();

  return (
    <Card className="pb-0">
      <CardHeader>
        <CardTitle>Snapshot history</CardTitle>
        <CardDescription>This holding in every snapshot that included it.</CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Date</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Avg price</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Invested</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="pr-4 text-right">P&L</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ row, quantityChange }) => (
            <TableRow key={row.snapshotId}>
              <TableCell className="pl-4">{formatSnapshotDate(row.snapshotDate)}</TableCell>
              <TableCell className="text-right tabular-nums">
                <div>{formatQuantity(row.quantity)}</div>
                {quantityChange !== 0 ? (
                  <div className="text-xs">
                    <SignedValue value={quantityChange}>{formatQuantityChange(quantityChange)}</SignedValue>
                  </div>
                ) : null}
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(row.averageBuyPrice)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(row.currentPrice)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(row.investedAmount)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(row.currentValue)}</TableCell>
              <TableCell className="pr-4 text-right tabular-nums">
                <div>
                  <SignedValue value={row.pnlAmount}>{formatMoneyChange(row.pnlAmount)}</SignedValue>
                </div>
                <div className="text-xs">
                  <SignedValue value={row.pnlAmount}>{formatPercentage(row.pnlPercentage)}</SignedValue>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
