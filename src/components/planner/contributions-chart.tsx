"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useCurrency, useMoneyFormat } from "@/components/currency/currency-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { convertFromUsd } from "@/lib/currency/currency";
import { formatSnapshotDate } from "@/lib/format/date";
import { formatCompactMoney } from "@/lib/format/number";
import { addMonths } from "@/lib/portfolio/analytics/monthly-performance";
import { monthOf, monthsBetween, type MonthlyContribution } from "@/lib/portfolio/planner/contributions";
import { cn } from "@/lib/utils";

const RANGES = [
  { id: "6M", months: 6 },
  { id: "1Y", months: 12 },
  { id: "ALL", months: null },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

const monthShort = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const monthLong = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const toDate = (month: string) => new Date(`${month}-01T00:00:00Z`);

const HATCH_ID = "contribution-estimated-hatch";

function barFill(entry: MonthlyContribution): string {
  if (entry.amount !== null && entry.amount < 0) return "var(--negative)";
  return entry.isEstimated ? `url(#${HATCH_ID})` : "var(--chart-2)";
}

function ContributionTooltip({
  active,
  payload,
  moneyChange,
}: {
  active?: boolean;
  payload?: { payload?: MonthlyContribution }[];
  moneyChange: (value: number | null) => string;
}) {
  const entry = payload?.[0]?.payload;
  if (!active || !entry) return null;

  return (
    <div className="bg-popover text-popover-foreground grid max-w-64 gap-1 rounded-md border px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground font-medium uppercase">{monthLong.format(toDate(entry.month))}</p>
      {entry.isBaseline ? (
        <>
          <p className="text-sm font-semibold tabular-nums">{moneyChange(entry.amount)}</p>
          <p className="text-muted-foreground">
            Everything invested by your first snapshot ({formatSnapshotDate(entry.toDate!)}), counted as this month.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold tabular-nums">{moneyChange(entry.amount)}</p>
          {entry.isEstimated ? (
            <p className="text-muted-foreground">
              Estimated: the change from {formatSnapshotDate(entry.fromDate!)} to {formatSnapshotDate(entry.toDate!)} split
              evenly over {monthsBetween(monthOf(entry.fromDate!), monthOf(entry.toDate!))} months.
            </p>
          ) : (
            <p className="text-muted-foreground">
              {formatSnapshotDate(entry.fromDate!)} → {formatSnapshotDate(entry.toDate!)}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function ContributionsChart({
  months: allMonths,
  sixMonthAverage,
}: {
  months: MonthlyContribution[];
  sixMonthAverage: number | null;
}) {
  const { currency, rate } = useCurrency();
  const { moneyChange } = useMoneyFormat();
  const [selectedRange, setRange] = useState<RangeId>("1Y");

  const ranges = RANGES.filter((option) => option.months === null || option.months < allMonths.length);
  const range = ranges.some((option) => option.id === selectedRange) ? selectedRange : "ALL";

  const months = useMemo(() => {
    const windowMonths = RANGES.find((option) => option.id === range)!.months;
    const latest = allMonths.at(-1)?.month;
    if (!latest || windowMonths === null) return allMonths;

    const start = addMonths(latest, -(windowMonths - 1));
    return allMonths.filter((entry) => entry.month >= start);
  }, [allMonths, range]);

  const data = useMemo(
    () =>
      months.map((entry) => ({
        ...entry,
        displayAmount: entry.amount === null ? null : convertFromUsd(entry.amount, currency, rate),
      })),
    [months, currency, rate],
  );

  const hasEstimates = months.some((entry) => entry.isEstimated);

  return (
    <Card>
      <CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
        <div className="grid gap-1">
          <CardTitle>Money invested each month</CardTitle>
          <CardDescription>
            Net change in invested amount between month-end snapshots. Sales lower it, so a month can be negative.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:justify-end" role="group" aria-label="Range">
          {ranges.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setRange(option.id)}
              aria-pressed={range === option.id}
              className={cn(
                "focus-visible:ring-ring/50 h-8 min-w-11 rounded-full border px-3 text-xs font-semibold transition-colors outline-none focus-visible:ring-3",
                range === option.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              {option.id}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ backgroundColor: "var(--chart-2)" }} />
            Measured
          </span>
          {hasEstimates ? (
            <span className="flex items-center gap-1.5">
              <svg aria-hidden="true" className="size-2.5 rounded-sm" viewBox="0 0 10 10">
                <rect width="10" height="10" fill="var(--chart-2)" fillOpacity={0.25} />
                <path d="M-2,2 l4,-4 M0,10 l10,-10 M8,12 l4,-4" stroke="var(--chart-2)" strokeWidth={2} />
              </svg>
              Estimated (no snapshot that month)
            </span>
          ) : null}
          {sixMonthAverage !== null ? (
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="w-3 border-t-2 border-dashed" style={{ borderColor: "var(--chart-1)" }} />
              6-month average
            </span>
          ) : null}
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <pattern id={HATCH_ID} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="6" height="6" fill="var(--chart-2)" fillOpacity={0.25} />
                  <line x1="0" y1="0" x2="0" y2="6" stroke="var(--chart-2)" strokeWidth={3} />
                </pattern>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="month"
                tickFormatter={(month: string) => `${monthShort.format(toDate(month))} ’${month.slice(2, 4)}`}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                minTickGap={8}
              />
              <YAxis
                tickFormatter={(value: number) => formatCompactMoney(value, currency)}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
              {sixMonthAverage !== null ? (
                <ReferenceLine
                  y={convertFromUsd(sixMonthAverage, currency, rate)}
                  stroke="var(--chart-1)"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
              ) : null}
              <Tooltip
                cursor={{ fill: "var(--accent)", opacity: 0.5 }}
                content={<ContributionTooltip moneyChange={moneyChange} />}
              />
              <Bar dataKey="displayAmount" radius={4} maxBarSize={48} isAnimationActive={false}>
                {data.map((entry) => (
                  <Cell key={entry.month} fill={barFill(entry)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {months.length <= 1 ? (
          <p className="text-muted-foreground text-xs">
            Upload a snapshot next month to see how much you invest each month.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
