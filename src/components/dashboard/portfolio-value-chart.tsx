"use client";

import { ChartArea, ChartColumn, ChartLine, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
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
import { useStoredChoice } from "@/lib/hooks/use-stored-choice";
import type { HistoryPoint } from "@/lib/portfolio/analytics/dashboard";
import { cn } from "@/lib/utils";

const CHART_TYPES = ["line", "area", "bar"] as const;
type ChartType = (typeof CHART_TYPES)[number];

const CHART_TYPE_OPTIONS: { id: ChartType; label: string; icon: LucideIcon }[] = [
  { id: "line", label: "Line", icon: ChartLine },
  { id: "area", label: "Area", icon: ChartArea },
  { id: "bar", label: "Bars", icon: ChartColumn },
];

const CHART_TYPE_STORAGE_KEY = "pit:portfolio-history-chart-type";

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
  const [chartType, setChartType] = useStoredChoice(CHART_TYPE_STORAGE_KEY, CHART_TYPES, "line");
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
      <CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
        <div className="grid gap-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="bg-muted flex w-fit gap-0.5 rounded-lg p-0.5" role="group" aria-label="Chart type">
          {CHART_TYPE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setChartType(option.id)}
              aria-pressed={chartType === option.id}
              title={`${option.label} chart`}
              className={cn(
                "focus-visible:ring-ring/50 inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3",
                chartType === option.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <option.icon className="size-3.5" aria-hidden="true" />
              {option.label}
            </button>
          ))}
        </div>
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
            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
                domain={chartType === "line" ? ["auto", "auto"] : [(dataMin: number) => Math.min(0, dataMin), "auto"]}
                tickFormatter={(value: number) => formatCompactMoney(value, currency)}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip
                content={<ChartTooltip currency={currency} />}
                cursor={chartType === "bar" ? { fill: "var(--accent)", opacity: 0.5 } : undefined}
              />
              {SERIES.filter((series) => visible[series.key]).map((series) => {
                if (chartType === "bar") {
                  return (
                    <Bar
                      key={series.key}
                      dataKey={series.key}
                      name={series.label}
                      fill={series.color}
                      fillOpacity={series.dashed ? 0.55 : 0.9}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                      isAnimationActive={false}
                    />
                  );
                }

                if (chartType === "area") {
                  return (
                    <Area
                      key={series.key}
                      dataKey={series.key}
                      name={series.label}
                      type="monotone"
                      stroke={series.color}
                      fill={series.color}
                      fillOpacity={0.12}
                      strokeWidth={2}
                      strokeDasharray={series.dashed ? "4 4" : undefined}
                      dot={false}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  );
                }

                return (
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
                );
              })}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
