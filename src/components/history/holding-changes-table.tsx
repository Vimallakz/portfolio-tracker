"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";

import { SecurityLabel } from "@/components/dashboard/security-label";
import { HoldingStatusBadge } from "@/components/shared/holding-status-badge";
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
import {
  formatMoney,
  formatMoneyChange,
  formatPercentage,
  formatQuantity,
  formatQuantityChange,
} from "@/lib/format/number";
import type { HoldingChangeStatus } from "@/lib/portfolio/comparison/snapshot-comparator";
import type { ComparedHolding } from "@/lib/portfolio/history/history";
import { cn } from "@/lib/utils";

type MetricKey = "quantity" | "investedAmount" | "currentValue" | "pnlAmount" | "pnlPercentage" | "weight";
export type HoldingSortKey = "name" | "status" | MetricKey;
export type HoldingSort = { key: HoldingSortKey; direction: "asc" | "desc" };

const COLUMNS: { key: HoldingSortKey; label: string; numeric?: boolean }[] = [
  { key: "name", label: "Security" },
  { key: "status", label: "Change" },
  { key: "quantity", label: "Qty", numeric: true },
  { key: "investedAmount", label: "Invested", numeric: true },
  { key: "currentValue", label: "Value", numeric: true },
  { key: "pnlAmount", label: "P&L", numeric: true },
  { key: "pnlPercentage", label: "P&L %", numeric: true },
  { key: "weight", label: "Weight", numeric: true },
];

const STATUS_ORDER: Record<HoldingChangeStatus, number> = { NEW: 0, INCREASED: 1, REDUCED: 2, UNCHANGED: 3, REMOVED: 4 };

/** A removed holding has no current figures, so its last known ones are shown; number sorts keep it last. */
const metric = (h: ComparedHolding, key: MetricKey) => Number((h.next ?? h.previous)?.[key] ?? 0);
const change = (h: ComparedHolding, key: MetricKey) => (h.changes ? Number(h.changes[key]) : 0);

function sortHoldings(holdings: ComparedHolding[], { key, direction }: HoldingSort): ComparedHolding[] {
  const sign = direction === "asc" ? 1 : -1;

  return [...holdings].sort((a, b) => {
    if (key !== "name" && key !== "status") {
      const removedOrder = Number(a.status === "REMOVED") - Number(b.status === "REMOVED");
      if (removedOrder) return removedOrder;
    }

    const result =
      key === "name"
        ? a.name.localeCompare(b.name)
        : key === "status"
          ? STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
          : metric(a, key) - metric(b, key);

    return sign * result || a.name.localeCompare(b.name);
  });
}

type HoldingChangesTableProps = {
  title: string;
  description: string;
  holdings: ComparedHolding[];
  defaultSort?: HoldingSort;
};

export function HoldingChangesTable({
  title,
  description,
  holdings,
  defaultSort = { key: "status", direction: "asc" },
}: HoldingChangesTableProps) {
  const [sort, setSort] = useState<HoldingSort>(defaultSort);
  const sorted = useMemo(() => sortHoldings(holdings, sort), [holdings, sort]);

  function toggleSort(key: HoldingSortKey, numeric: boolean) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: numeric ? "desc" : "asc" },
    );
  }

  return (
    <Card className="pb-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => {
              const active = sort.key === column.key;
              const Icon = active ? (sort.direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

              return (
                <TableHead
                  key={column.key}
                  aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}
                  className={cn(column.numeric && "text-right", column.key === "name" && "pl-4", column.key === "weight" && "pr-4")}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key, column.numeric ?? false)}
                    className={cn(
                      "hover:text-foreground inline-flex items-center gap-1",
                      column.numeric && "flex-row-reverse",
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
          {sorted.map((h) => {
            const removed = h.status === "REMOVED";
            const quantityChange = change(h, "quantity");
            const investedChange = change(h, "investedAmount");
            const valueChange = change(h, "currentValue");
            const pnl = metric(h, "pnlAmount");

            return (
              <TableRow key={h.key} className={removed ? "text-muted-foreground" : undefined}>
                <TableCell className="max-w-64 pl-4">
                  <SecurityLabel securityId={h.securityId} name={h.name} ticker={h.ticker} type={h.type} />
                </TableCell>
                <TableCell>
                  <HoldingStatusBadge status={h.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {h.previous && h.next && quantityChange ? (
                    <>
                      <div>
                        {formatQuantity(Number(h.previous.quantity))} → {formatQuantity(Number(h.next.quantity))}
                      </div>
                      <div className="text-xs">
                        <SignedValue value={quantityChange}>{formatQuantityChange(quantityChange)}</SignedValue>
                      </div>
                    </>
                  ) : (
                    formatQuantity(metric(h, "quantity"))
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <div>{formatMoney(metric(h, "investedAmount"))}</div>
                  {investedChange ? (
                    <div className="text-muted-foreground text-xs">{formatMoneyChange(investedChange)}</div>
                  ) : null}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <div>{formatMoney(metric(h, "currentValue"))}</div>
                  {valueChange ? (
                    <div className="text-xs">
                      <SignedValue value={valueChange}>{formatMoneyChange(valueChange)}</SignedValue>
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <SignedValue value={removed ? null : pnl}>{formatMoneyChange(pnl)}</SignedValue>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <SignedValue value={removed ? null : pnl}>{formatPercentage(metric(h, "pnlPercentage"))}</SignedValue>
                </TableCell>
                <TableCell className="pr-4 text-right tabular-nums">
                  {removed ? "—" : `${formatQuantity(metric(h, "weight"))}%`}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
