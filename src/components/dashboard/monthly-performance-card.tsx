"use client";

import { cn } from "cn";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useMoneyFormat } from "@/components/currency/currency-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSnapshotDate } from "@/lib/format/date";
import { formatPercentage, signednessOf } from "@/lib/format/number";
import type { HistoryPoint } from "@/lib/portfolio/analytics/dashboard";
import {
  availableRanges,
  buildMonthlyPerformance,
  selectMonthlyRange,
  type MonthlyPerformance,
  type PerformanceRange,
} from "@/lib/portfolio/analytics/monthly-performance";

const monthShort = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const monthLong = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const toDate = (month: string) => new Date(`${month}-01T00:00:00Z`);

const SIGN_COLOR = {
  positive: "var(--positive)",
  negative: "var(--negative)",
  neutral: "var(--muted-foreground)",
} as const;

const SIGN_TEXT = {
  positive: "text-positive",
  negative: "text-negative",
  neutral: "text-muted-foreground",
} as const;

const MAX_BAR_SIZE = 56;

/** Full-height track behind each month, sized like its bar (80% of the slot, capped) so empty months still read as columns. */
function MonthColumn({ x = 0, y = 0, width = 0, height = 0 }: { x?: number; y?: number; width?: number; height?: number }) {
  const columnWidth = Math.min(width * 0.8, MAX_BAR_SIZE);

  return (
    <rect
      x={x + (width - columnWidth) / 2}
      y={y}
      width={columnWidth}
      height={height}
      rx={4}
      fill="var(--muted)"
      fillOpacity={0.7}
    />
  );
}

/** Symmetric axis bound: the largest move rounded up to 1, 2 or 5 × a power of ten, so 0% sits in the middle. */
function niceExtent(maxAbs: number): number {
  if (maxAbs <= 0) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(maxAbs));
  const step = [1, 2, 5, 10].find((candidate) => candidate * magnitude >= maxAbs)!;

  return step * magnitude;
}

function statusOf(entry: MonthlyPerformance): string {
  if (entry.isBaseline) return "First snapshot";
  if (entry.returnPercentage === null) return "No snapshot";
  return formatPercentage(entry.returnPercentage);
}

function MonthTick({ x, y, payload, months }: { x?: number; y?: number; payload?: { index: number }; months: MonthlyPerformance[] }) {
  const entry = payload ? months[payload.index] : undefined;
  if (!entry || x === undefined || y === undefined) return null;

  const sign = signednessOf(entry.returnPercentage);

  return (
    <g transform={`translate(${x},${y})`}>
      <text dy={12} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
        {monthShort.format(toDate(entry.month)).toUpperCase()} ’{entry.month.slice(2, 4)}
      </text>
      <text
        dy={28}
        textAnchor="middle"
        fontSize={11}
        fontWeight={entry.returnPercentage === null ? 400 : 500}
        fill={entry.returnPercentage === null ? "var(--muted-foreground)" : SIGN_COLOR[sign]}
      >
        {entry.returnPercentage === null ? (entry.isBaseline ? "Start" : "—") : formatPercentage(entry.returnPercentage)}
      </text>
    </g>
  );
}

function MonthTooltip({
  active,
  payload,
  moneyChange,
}: {
  active?: boolean;
  payload?: { payload?: MonthlyPerformance }[];
  moneyChange: (value: number | null) => string;
}) {
  const entry = payload?.[0]?.payload;
  if (!active || !entry) return null;

  const sign = signednessOf(entry.gain);

  return (
    <div className="bg-popover text-popover-foreground grid gap-1 rounded-md border px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground font-medium uppercase">{monthLong.format(toDate(entry.month))}</p>
      {entry.gain === null ? (
        <p>{entry.isBaseline ? "First snapshot. Performance starts from here." : "No snapshot this month."}</p>
      ) : (
        <>
          <p className={cn("text-sm font-semibold tabular-nums", SIGN_TEXT[sign])}>
            {sign === "negative" ? "↓" : sign === "positive" ? "↑" : ""} {moneyChange(entry.gain)}
          </p>
          <p className={cn("tabular-nums", SIGN_TEXT[sign])}>{statusOf(entry)}</p>
          <p className="text-muted-foreground">
            {formatSnapshotDate(entry.fromDate!)} → {formatSnapshotDate(entry.toDate!)}
          </p>
        </>
      )}
    </div>
  );
}

export function MonthlyPerformanceCard({ history }: { history: HistoryPoint[] }) {
  const { moneyChange } = useMoneyFormat();
  const [selectedRange, setRange] = useState<PerformanceRange>("YTD");

  const allMonths = useMemo(() => buildMonthlyPerformance(history), [history]);
  const ranges = useMemo(() => availableRanges(allMonths), [allMonths]);
  const range = ranges.includes(selectedRange) ? selectedRange : "ALL";
  const months = useMemo(() => selectMonthlyRange(allMonths, range), [allMonths, range]);

  const extent = niceExtent(Math.max(0, ...months.map((entry) => Math.abs(entry.returnPercentage ?? 0))));

  const measured = months.filter((entry) => entry.gain !== null);
  const totalGain = measured.reduce((sum, entry) => sum + entry.gain!, 0);
  const totalSign = signednessOf(totalGain);

  return (
    <Card>
      <CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
        <div className="grid gap-1">
          <CardTitle>Monthly performance</CardTitle>
          <CardDescription>
            Market gain each month, excluding money you added or withdrew. Measured between month-end snapshots.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:justify-end" role="group" aria-label="Range">
          {ranges.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              aria-pressed={range === option}
              className={cn(
                "focus-visible:ring-ring/50 h-8 min-w-11 rounded-full border px-3 text-xs font-semibold transition-colors outline-none focus-visible:ring-3",
                range === option
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-sm">
          {measured.length === 0 ? (
            <span className="text-muted-foreground">
              No month-to-month change in this range yet. Upload snapshots in more months to fill the chart.
            </span>
          ) : (
            <>
              <span className="text-muted-foreground">Gain in range </span>
              <span className={cn("font-semibold tabular-nums", SIGN_TEXT[totalSign])}>{moneyChange(totalGain)}</span>
            </>
          )}
        </p>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={months} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="month"
                interval={0}
                height={40}
                tickLine={false}
                axisLine={false}
                tick={<MonthTick months={months} />}
              />
              <YAxis
                domain={[-extent, extent]}
                ticks={[-extent, -extent / 2, 0, extent / 2, extent]}
                tickFormatter={(value: number) => `${Number(value.toFixed(2))}%`}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              {months.map((entry) => (
                <ReferenceArea
                  key={entry.month}
                  x1={entry.month}
                  x2={entry.month}
                  y1={-extent}
                  y2={extent}
                  ifOverflow="hidden"
                  shape={MonthColumn}
                />
              ))}
              <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
              <Tooltip
                cursor={{ fill: "var(--accent)", opacity: 0.5 }}
                content={<MonthTooltip moneyChange={moneyChange} />}
              />
              <Bar
                dataKey="returnPercentage"
                radius={4}
                maxBarSize={MAX_BAR_SIZE}
                isAnimationActive={false}
              >
                {months.map((entry) => (
                  <Cell key={entry.month} fill={SIGN_COLOR[signednessOf(entry.returnPercentage)]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
