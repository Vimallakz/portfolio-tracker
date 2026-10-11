"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import {
  formatMonthLabel,
  MarketComparisonNote,
  MarketStatTiles,
  MarketVerdict,
  MonthlyMarketTable,
  PORTFOLIO_COLOR,
} from "@/components/benchmark/market-comparison-summary";
import { CardShell } from "@/components/shared/card-shell";
import { formatSnapshotDate } from "@/lib/format/date";
import { formatPercentage } from "@/lib/format/number";
import { BENCHMARKS, type MarketPeriod } from "@/lib/portfolio/benchmark/benchmark";

const BARS = [
  { key: "you", label: "You", color: PORTFOLIO_COLOR },
  ...BENCHMARKS.map((benchmark) => ({ key: benchmark.symbol, label: benchmark.label, color: benchmark.color })),
];

type TooltipEntry = { dataKey?: unknown; value?: unknown };

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: unknown }) {
  if (!active || !payload?.length || typeof label !== "string") {
    return null;
  }

  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{formatMonthLabel(label)}</p>
      {payload.map((entry) => {
        const bar = BARS.find((item) => item.key === entry.dataKey);
        if (!bar) return null;

        return (
          <p key={bar.key} className="flex justify-between gap-4 tabular-nums">
            <span className="text-muted-foreground">{bar.label}</span>
            <span>{formatPercentage(typeof entry.value === "number" ? entry.value : null)}</span>
          </p>
        );
      })}
    </div>
  );
}

export function MarketComparisonCard({
  sinceStart,
  months,
  startDate,
  embedded = false,
}: {
  sinceStart: MarketPeriod;
  months: MarketPeriod[];
  /** First snapshot date, where the comparison starts. */
  startDate: string;
  /** Rendered inside another card, such as a dashboard tab. */
  embedded?: boolean;
}) {
  const bars = BARS.filter(
    (bar) => bar.key === "you" || months.some((month) => month.indexes.some((move) => move.symbol === bar.key)),
  );
  const data = useMemo(
    () =>
      months.map((month) => ({
        month: month.toMonth,
        you: month.yourReturn,
        ...Object.fromEntries(month.indexes.map((move) => [move.symbol, move.change])),
      })),
    [months],
  );

  return (
    <CardShell
      title="You vs the market"
      embedded={embedded}
      description={
        <>
          Each month, your return against the S&amp;P 500 and Nasdaq 100 bought at the last close of the month before
          and held to the month&apos;s last close. Your first snapshot ({formatSnapshotDate(startDate)}) counts as
          invested at the start of its month.
        </>
      }
    >
      {embedded ? null : <MarketVerdict period={sinceStart} />}
      <MarketStatTiles period={sinceStart} />

      {months.length > 0 ? (
        <div className="grid gap-2">
          <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Chart bars">
            {bars.map((bar) => (
              <li key={bar.key} className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: bar.color }} />
                {bar.label}
              </li>
            ))}
          </ul>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickFormatter={(value: string) => formatMonthLabel(value)}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value: number) => `${value}%`}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <ReferenceLine y={0} stroke="var(--border)" />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--accent)", opacity: 0.5 }} />
                {bars.map((bar) => (
                  <Bar
                    key={bar.key}
                    dataKey={bar.key}
                    name={bar.label}
                    fill={bar.color}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={22}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <MonthlyMarketTable months={months} />
        </div>
      ) : null}

      <MarketComparisonNote period={sinceStart} />
    </CardShell>
  );
}
