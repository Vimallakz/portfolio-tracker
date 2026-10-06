"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";

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
import { formatMoney, formatMoneyChange, formatPercentage } from "@/lib/format/number";
import type { HoldingPerformance } from "@/lib/portfolio/analytics/dashboard";
import { cn } from "@/lib/utils";

const weightFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

type SortKey = "name" | "currentValue" | "pnlAmount" | "pnlPercentage" | "weight";
type Sort = { key: SortKey; direction: "asc" | "desc" };

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "name", label: "Security", className: "pl-4" },
  { key: "currentValue", label: "Value", className: "text-right" },
  { key: "pnlAmount", label: "P&L", className: "text-right" },
  { key: "pnlPercentage", label: "P&L %", className: "text-right" },
  { key: "weight", label: "Weight", className: "w-40 pr-4 text-right" },
];

function sortHoldings(holdings: HoldingPerformance[], { key, direction }: Sort): HoldingPerformance[] {
  const sign = direction === "asc" ? 1 : -1;

  return [...holdings].sort((a, b) =>
    key === "name" ? sign * a.name.localeCompare(b.name) : sign * (a[key] - b[key]),
  );
}

export function LargestHoldingsCard({ holdings }: { holdings: HoldingPerformance[] }) {
  const [sort, setSort] = useState<Sort>({ key: "weight", direction: "desc" });
  const sorted = useMemo(() => sortHoldings(holdings, sort), [holdings, sort]);

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "name" ? "asc" : "desc" },
    );
  }

  return (
    <Card className="pb-0">
      <CardHeader>
        <CardTitle>Largest holdings</CardTitle>
        <CardDescription>Top {holdings.length} by weight in the latest snapshot.</CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => {
              const active = sort.key === column.key;
              const Icon = active ? (sort.direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
              const numeric = column.key !== "name";

              return (
                <TableHead
                  key={column.key}
                  aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}
                  className={column.className}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className={cn(
                      "hover:text-foreground inline-flex items-center gap-1",
                      numeric && "flex-row-reverse",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {column.label}
                    <Icon aria-hidden="true" className={cn("size-3", !active && "opacity-50")} />
                  </button>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((h) => (
            <TableRow key={h.securityId}>
              <TableCell className="max-w-64 pl-4">
                <SecurityLabel securityId={h.securityId} name={h.name} ticker={h.ticker} type={h.type} />
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(h.currentValue)}</TableCell>
              <TableCell className="text-right tabular-nums">
                <SignedValue value={h.pnlAmount}>{formatMoneyChange(h.pnlAmount)}</SignedValue>
              </TableCell>
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
