"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { ConvictionStars } from "@/components/research/conviction-stars";
import { SignedValue } from "@/components/shared/signed-value";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney, formatMoneyChange, formatPercentage, formatQuantity } from "@/lib/format/number";
import {
  DEFAULT_SECURITY_FILTERS,
  DEFAULT_SECURITY_SORT,
  filterSecurityRows,
  sortSecurityRows,
  type SecurityListFilters,
  type SecurityListRow,
  type SecuritySort,
  type SecuritySortKey,
} from "@/lib/portfolio/securities/security-list";
import { CONVICTION_LABEL, CONVICTIONS, INVESTMENT_STATUS_LABEL, INVESTMENT_STATUSES } from "@/lib/research/labels";
import type { TagSummary } from "@/lib/tags/schema";
import { cn } from "@/lib/utils";

const weightFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

type Column = { key: SecuritySortKey; label: string; numeric?: boolean };

const COLUMNS: Column[] = [
  { key: "name", label: "Security" },
  { key: "type", label: "Type" },
  { key: "quantity", label: "Qty", numeric: true },
  { key: "investedAmount", label: "Invested", numeric: true },
  { key: "currentValue", label: "Value", numeric: true },
  { key: "pnlAmount", label: "P&L", numeric: true },
  { key: "pnlPercentage", label: "P&L %", numeric: true },
  { key: "weight", label: "Weight", numeric: true },
  { key: "investmentStatus", label: "Status" },
  { key: "conviction", label: "Conviction" },
];

type SecurityTableProps = {
  rows: SecurityListRow[];
  tags: TagSummary[];
  initialFilters?: Partial<SecurityListFilters>;
};

export function SecurityTable({ rows, tags, initialFilters }: SecurityTableProps) {
  const [filters, setFilters] = useState<SecurityListFilters>({ ...DEFAULT_SECURITY_FILTERS, ...initialFilters });
  const [sort, setSort] = useState<SecuritySort>(DEFAULT_SECURITY_SORT);

  const visible = useMemo(() => sortSecurityRows(filterSecurityRows(rows, filters), sort), [rows, filters, sort]);

  const isFiltered = JSON.stringify(filters) !== JSON.stringify(DEFAULT_SECURITY_FILTERS);

  function update<K extends keyof SecurityListFilters>(key: K, value: SecurityListFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function toggleSort(key: SecuritySortKey, numeric: boolean) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: numeric ? "desc" : "asc" },
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <div className="relative sm:col-span-2 lg:col-span-4 xl:col-span-1">
          <Search aria-hidden="true" className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="search"
            placeholder="Search name or ticker"
            aria-label="Search securities"
            className="pl-8"
            value={filters.query}
            onChange={(event) => update("query", event.target.value)}
          />
        </div>
        <NativeSelect aria-label="Type" value={filters.type} onChange={(e) => update("type", e.target.value as SecurityListFilters["type"])}>
          <option value="ALL">All types</option>
          <option value="STOCK">Stocks</option>
          <option value="ETF">ETFs</option>
        </NativeSelect>
        <NativeSelect aria-label="Tag" value={filters.tag} onChange={(e) => update("tag", e.target.value)} disabled={tags.length === 0}>
          <option value="ALL">{tags.length === 0 ? "No tags yet" : "All tags"}</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Status" value={filters.status} onChange={(e) => update("status", e.target.value as SecurityListFilters["status"])}>
          <option value="ALL">Any status</option>
          <option value="NONE">No status</option>
          {INVESTMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {INVESTMENT_STATUS_LABEL[status]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Conviction"
          value={filters.conviction}
          onChange={(e) => update("conviction", e.target.value as SecurityListFilters["conviction"])}
        >
          <option value="ALL">Any conviction</option>
          <option value="NONE">No conviction</option>
          {CONVICTIONS.map((conviction) => (
            <option key={conviction} value={conviction}>
              {CONVICTION_LABEL[conviction]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Profit or loss" value={filters.pnl} onChange={(e) => update("pnl", e.target.value as SecurityListFilters["pnl"])}>
          <option value="ALL">Gains and losses</option>
          <option value="GAIN">In profit</option>
          <option value="LOSS">At a loss</option>
        </NativeSelect>
        <NativeSelect aria-label="Ticker" value={filters.ticker} onChange={(e) => update("ticker", e.target.value as SecurityListFilters["ticker"])}>
          <option value="ALL">With or without ticker</option>
          <option value="MISSING">Missing ticker</option>
        </NativeSelect>
      </div>

      <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
        <span>
          Showing {visible.length} of {rows.length} {rows.length === 1 ? "security" : "securities"}
        </span>
        {isFiltered ? (
          <Button size="xs" variant="ghost" onClick={() => setFilters(DEFAULT_SECURITY_FILTERS)}>
            Clear filters
          </Button>
        ) : null}
      </div>

      <Card className="py-0">
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
                    className={cn(column.numeric && "text-right", column.key === "name" && "pl-4", column.key === "conviction" && "pr-4")}
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
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNS.length} className="text-muted-foreground py-10 text-center">
                  No securities match these filters.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((row) => (
                <TableRow key={row.securityId}>
                  <TableCell className="max-w-72 pl-4">
                    <Link href={`/securities/${row.securityId}`} className="block truncate font-medium hover:underline" title={row.name}>
                      {row.name}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1">
                      {row.ticker ? (
                        <span className="text-muted-foreground text-xs">{row.ticker}</span>
                      ) : (
                        <span className="text-warning text-xs">No ticker</span>
                      )}
                      {row.tags.map((tag) => (
                        <Badge key={tag.id} variant="outline" className="h-4 px-1.5 text-[0.65rem]">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{row.type === "ETF" ? "ETF" : "Stock"}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatQuantity(row.quantity)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(row.investedAmount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(row.currentValue)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <SignedValue value={row.pnlAmount}>{formatMoneyChange(row.pnlAmount)}</SignedValue>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <SignedValue value={row.pnlAmount}>{formatPercentage(row.pnlPercentage)}</SignedValue>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{weightFormat.format(row.weight)}%</TableCell>
                  <TableCell>
                    {row.investmentStatus ? (
                      <Badge variant="secondary">{INVESTMENT_STATUS_LABEL[row.investmentStatus]}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="pr-4">
                    {row.conviction ? (
                      <ConvictionStars conviction={row.conviction} showLabel={false} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
