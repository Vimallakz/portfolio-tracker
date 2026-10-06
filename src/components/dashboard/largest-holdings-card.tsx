import { SecurityLabel } from "@/components/dashboard/security-label";
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
import { formatMoney, formatPercentage } from "@/lib/format/number";
import type { HoldingPerformance } from "@/lib/portfolio/analytics/dashboard";

const weightFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function LargestHoldingsCard({ holdings }: { holdings: HoldingPerformance[] }) {
  return (
    <Card className="pb-0">
      <CardHeader>
        <CardTitle>Largest holdings</CardTitle>
        <CardDescription>By weight in the latest snapshot.</CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Security</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="text-right">P&L %</TableHead>
            <TableHead className="w-40 pr-4 text-right">Weight</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((h) => (
            <TableRow key={h.securityId}>
              <TableCell className="max-w-64 pl-4">
                <SecurityLabel name={h.name} ticker={h.ticker} type={h.type} />
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(h.currentValue)}</TableCell>
              <TableCell className="text-right tabular-nums">
                <SignedValue value={h.pnlPercentage}>{formatPercentage(h.pnlPercentage)}</SignedValue>
              </TableCell>
              <TableCell className="pr-4">
                <div className="flex items-center justify-end gap-2">
                  <div className="bg-muted hidden h-1.5 w-20 overflow-hidden rounded-full sm:block" aria-hidden="true">
                    <div className="bg-foreground/70 h-full" style={{ width: `${Math.min(h.weight, 100)}%` }} />
                  </div>
                  <span className="w-14 text-right tabular-nums">{weightFormat.format(h.weight)}%</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
