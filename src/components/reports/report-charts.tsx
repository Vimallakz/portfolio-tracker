"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";

import { useCurrency } from "@/components/currency/currency-provider";
import { convertFromUsd } from "@/lib/currency/currency";
import { formatCompactMoney, formatMoney, formatMoneyChange, signednessOf } from "@/lib/format/number";
import type { HistoryPoint } from "@/lib/portfolio/analytics/dashboard";

/**
 * Fixed size rather than responsive, so the chart is laid out the same on
 * screen and on an A4 page (about 700px wide at 12mm margins).
 */
const CHART_WIDTH = 696;
const CHART_HEIGHT = 220;

const SIGN_COLOR = {
  positive: "var(--positive)",
  negative: "var(--negative)",
  neutral: "var(--muted-foreground)",
} as const;

const axisDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const toDate = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`);

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: 12,
};

/** The currency the report is shown in, for the report header. */
export function ReportCurrency() {
  return <>{useCurrency().currency}</>;
}

export function ReportValueChart({ series }: { series: HistoryPoint[] }) {
  const { currency, rate } = useCurrency();
  const data = useMemo(
    () =>
      series.map((point) => ({
        date: point.snapshotDate,
        value: convertFromUsd(point.currentValue, currency, rate),
        invested: convertFromUsd(point.investedAmount, currency, rate),
      })),
    [series, currency, rate],
  );

  return (
    <div className="overflow-x-auto">
      <LineChart width={CHART_WIDTH} height={CHART_HEIGHT} data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(date: string) => axisDate.format(toDate(date))}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[(dataMin: number) => Math.min(0, dataMin), "auto"]}
          tickFormatter={(value: number) => formatCompactMoney(value, currency)}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={60}
        />
        <Tooltip
          labelFormatter={(date) => axisDate.format(toDate(String(date)))}
          formatter={(value, name) => [formatMoney(Number(value), currency), name]}
          contentStyle={tooltipStyle}
        />
        <Line
          dataKey="value"
          name="Value"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--chart-1)" }}
          isAnimationActive={false}
        />
        <Line
          dataKey="invested"
          name="Invested"
          stroke="var(--chart-2)"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={{ r: 3, fill: "var(--chart-2)" }}
          isAnimationActive={false}
        />
      </LineChart>
    </div>
  );
}

/**
 * Where the end value came from: the starting value, plus money added, plus
 * the market's gain or loss. Each step floats on the running total.
 */
export function ReportBridgeChart({
  startValue,
  moneyInvested,
  marketGain,
  endValue,
  startDate,
  endDate,
}: {
  startValue: number;
  moneyInvested: number;
  marketGain: number;
  endValue: number;
  /** Null when the period starts from zero. */
  startDate: string | null;
  endDate: string;
}) {
  const { currency, rate } = useCurrency();
  const data = useMemo(() => {
    const convert = (usd: number) => convertFromUsd(usd, currency, rate);
    const afterFlow = startValue + moneyInvested;
    const startLabel = startDate ? `Value ${axisDate.format(toDate(startDate))}` : "Start";
    const endLabel = `Value ${axisDate.format(toDate(endDate))}`;
    // Not "fill": recharts would paint the invisible base bar with it too.
    const step = (name: string, from: number, change: number, color: string) => ({
      name,
      base: convert(Math.min(from, from + change)),
      size: convert(Math.abs(change)),
      label: formatMoneyChange(convert(change), currency),
      color,
    });

    return [
      { name: startLabel, base: 0, size: convert(startValue), label: formatMoney(convert(startValue), currency), color: "var(--muted-foreground)" },
      step(moneyInvested < 0 ? "Money withdrawn" : "Money added", startValue, moneyInvested, "var(--chart-2)"),
      step(marketGain < 0 ? "Market loss" : "Market gain", afterFlow, marketGain, SIGN_COLOR[signednessOf(marketGain)]),
      { name: endLabel, base: 0, size: convert(endValue), label: formatMoney(convert(endValue), currency), color: "var(--chart-1)" },
    ];
  }, [startValue, moneyInvested, marketGain, endValue, startDate, endDate, currency, rate]);

  return (
    <div className="overflow-x-auto">
      <BarChart width={CHART_WIDTH} height={CHART_HEIGHT} data={data} margin={{ top: 22, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
        <YAxis
          tickFormatter={(value: number) => formatCompactMoney(value, currency)}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={60}
        />
        <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
        <Bar dataKey="base" stackId="bridge" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="size" stackId="bridge" radius={6} maxBarSize={88} isAnimationActive={false}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} fillOpacity={entry.color === "var(--muted-foreground)" ? 0.35 : 0.9} />
          ))}
          <LabelList dataKey="label" position="top" fontSize={11} fontWeight={600} fill="var(--foreground)" />
        </Bar>
      </BarChart>
    </div>
  );
}
