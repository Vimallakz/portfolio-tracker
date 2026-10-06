"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useCurrency } from "@/components/currency/currency-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { convertFromUsd, type DisplayCurrency } from "@/lib/currency/currency";
import { formatCompactMoney, formatMoney } from "@/lib/format/number";
import type { HistoryPoint } from "@/lib/portfolio/analytics/dashboard";

type SeriesKey = "currentValue" | "investedAmount" | "pnlAmount";

const SERIES: { key: SeriesKey; label: string; color: string; dashed?: boolean }[] = [
  { key: "currentValue", label: "Current value", color: "var(--chart-1)" },
  { key: "investedAmount", label: "Invested", color: "var(--chart-2)", dashed: true },
  { key: "pnlAmount", label: "P&L", color: "var(--positive)" },
];

const axisDate = new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
const tooltipDate = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

const toDate = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`);

type TooltipEntry = { dataKey?: unknown; value?: unknown };

function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: unknown;
  currency: DisplayCurrency;
}) {
  if (!active || !payload?.length || typeof label !== "string") {
    return null;
  }

  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{tooltipDate.format(toDate(label))}</p>
      {payload.map((entry) => {
        const series = SERIES.find((s) => s.key === entry.dataKey);
        if (!series) return null;

        return (
          <p key={series.key} className="flex justify-between gap-4 tabular-nums">
            <span className="text-muted-foreground">{series.label}</span>
            <span>{formatMoney(typeof entry.value === "number" ? entry.value : null, currency)}</span>
          </p>
        );
      })}
    </div>
  );
}

type PortfolioValueChartProps = {
  history: HistoryPoint[];
  title?: string;
  description?: string;
};

export function PortfolioValueChart({
  history,
  title = "Portfolio history",
  description = "One point per uploaded snapshot. Values between snapshots are not tracked.",
}: PortfolioValueChartProps) {
  const { currency, rate } = useCurrency();
  const data = useMemo(
    () =>
      history.map((point) => ({
        snapshotDate: point.snapshotDate,
        currentValue: convertFromUsd(point.currentValue, currency, rate),
        investedAmount: convertFromUsd(point.investedAmount, currency, rate),
        pnlAmount: convertFromUsd(point.pnlAmount, currency, rate),
      })),
    [history, currency, rate],
  );
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    currentValue: true,
    investedAmount: true,
    pnlAmount: false,
  });

  function toggle(key: SeriesKey) {
    setVisible((current) => {
      const next = { ...current, [key]: !current[key] };
      // Keep at least one series on so the chart never renders empty.
      return Object.values(next).some(Boolean) ? next : current;
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Chart series">
          {SERIES.map((series) => (
            <Button
              key={series.key}
              type="button"
              size="xs"
              variant={visible[series.key] ? "secondary" : "outline"}
              aria-pressed={visible[series.key]}
              onClick={() => toggle(series.key)}
            >
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ backgroundColor: visible[series.key] ? series.color : "transparent", border: `1px solid ${series.color}` }}
              />
              {series.label}
            </Button>
          ))}
        </div>

        {history.length < 2 ? (
          <p className="text-muted-foreground text-xs">
            The chart fills in as you upload more snapshots. With one snapshot it shows a single point.
          </p>
        ) : null}

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="snapshotDate"
                tickFormatter={(value: string) => axisDate.format(toDate(value))}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                domain={["auto", "auto"]}
                tickFormatter={(value: number) => formatCompactMoney(value, currency)}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip content={<ChartTooltip currency={currency} />} />
              {SERIES.filter((series) => visible[series.key]).map((series) => (
                <Line
                  key={series.key}
                  dataKey={series.key}
                  name={series.label}
                  type="monotone"
                  stroke={series.color}
                  strokeWidth={2}
                  strokeDasharray={series.dashed ? "4 4" : undefined}
                  dot={{ r: 3, fill: series.color }}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
