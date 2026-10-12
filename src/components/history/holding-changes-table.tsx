"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";

import { Money } from "@/components/currency/money";
import { SecurityLabel } from "@/components/dashboard/security-label";
import { type StatusFilter, useChangeFilter } from "@/components/history/change-filter";
import { CardShell } from "@/components/shared/card-shell";
import { HOLDING_STATUS_LABEL, HoldingStatusBadge } from "@/components/shared/holding-status-badge";
import { SignedValue } from "@/components/shared/signed-value";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
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
const FILTER_STATUSES: HoldingChangeStatus[] = ["NEW", "INCREASED", "REDUCED", "REMOVED", "UNCHANGED"];

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
  /** Adds a row of change filters (New, Increased, …) with their counts. */
  filterable?: boolean;
};

export function HoldingChangesTable({
  title,
  description,
  holdings,
  defaultSort = { key: "status", direction: "asc" },
  filterable = false,
}: HoldingChangesTableProps) {
  const [sort, setSort] = useState<HoldingSort>(defaultSort);
  const [ownFilter, setOwnFilter] = useState<StatusFilter>("ALL");
  const shared = useChangeFilter();
  const filter = shared?.filter ?? ownFilter;
  const setFilter = shared?.setFilter ?? setOwnFilter;
  const sorted = useMemo(
    () => sortHoldings(filter === "ALL" ? holdings : holdings.filter((h) => h.status === filter), sort),
    [holdings, filter, sort],
  );

  const filters = useMemo(() => {
    const count = (status: HoldingChangeStatus) => holdings.filter((h) => h.status === status).length;
    return [
      { id: "ALL" as const, label: "All", count: holdings.length },
      ...FILTER_STATUSES.map((status) => ({ id: status, label: HOLDING_STATUS_LABEL[status], count: count(status) })),
    ].filter((option) => option.id === "ALL" || option.count > 0);
  }, [holdings]);

  function toggleSort(key: HoldingSortKey, numeric: boolean) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: numeric ? "desc" : "asc" },
    );
  }

  return (
    <CardShell
      title={title}
      description={description}
      flush
      actions={
        filterable ? (
          <div
            role="group"
            aria-label="Filter by change"
            className="bg-muted scrollbar-none flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-lg p-0.5"
          >
            {filters.map((option) => {
              const pressed = filter === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => setFilter(option.id)}
                  className={cn(
                    "focus-visible:ring-ring/50 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3",
                    pressed ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                  <span className="text-muted-foreground tabular-nums">{option.count}</span>
                </button>
              );
            })}
          </div>
        ) : undefined
      }
    >
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
                  <div><Money value={metric(h, "investedAmount")} /></div>
                  {investedChange ? (
                    <div className="text-muted-foreground text-xs"><Money value={investedChange} change /></div>
                  ) : null}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <div><Money value={metric(h, "currentValue")} /></div>
                  {valueChange ? (
                    <div className="text-xs">
                      <SignedValue value={valueChange}><Money value={valueChange} change /></SignedValue>
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <SignedValue value={removed ? null : pnl}><Money value={pnl} change /></SignedValue>
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
    </CardShell>
  );
}
