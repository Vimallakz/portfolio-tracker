"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";

import { useCurrency } from "@/components/currency/currency-provider";
import { convertFromUsd } from "@/lib/currency/currency";
import { formatCompactMoney, formatMoney, formatMoneyChange, formatPercentage, signednessOf } from "@/lib/format/number";
import type { HistoryPoint } from "@/lib/portfolio/analytics/dashboard";
import type { MonthlyPerformance } from "@/lib/portfolio/analytics/monthly-performance";

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
const axisMonth = new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
const toDate = (isoDate: string) => new Date(`${isoDate.length === 7 ? `${isoDate}-01` : isoDate}T00:00:00Z`);

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

export function ReportGainChart({ months }: { months: MonthlyPerformance[] }) {
  const { currency, rate } = useCurrency();
  const data = useMemo(
    () =>
      months.map((entry) => ({
        month: entry.month,
        gain: entry.gain === null ? null : convertFromUsd(entry.gain, currency, rate),
        label: entry.returnPercentage === null ? "" : formatPercentage(entry.returnPercentage),
        sign: signednessOf(entry.gain),
      })),
    [months, currency, rate],
  );

  return (
    <div className="overflow-x-auto">
      <BarChart width={CHART_WIDTH} height={CHART_HEIGHT} data={data} margin={{ top: 20, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={(month: string) => axisMonth.format(toDate(month))}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(value: number) => formatCompactMoney(value, currency)}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={60}
        />
        <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
        <Tooltip
          cursor={{ fill: "var(--accent)", opacity: 0.5 }}
          labelFormatter={(month) => axisMonth.format(toDate(String(month)))}
          formatter={(value) => [formatMoneyChange(Number(value), currency), "Market gain"]}
          contentStyle={tooltipStyle}
        />
        <Bar dataKey="gain" radius={4} maxBarSize={56} isAnimationActive={false}>
          {data.map((entry) => (
            <Cell key={entry.month} fill={SIGN_COLOR[entry.sign]} />
          ))}
          <LabelList dataKey="label" position="top" fontSize={11} fill="var(--muted-foreground)" />
        </Bar>
      </BarChart>
    </div>
  );
}
