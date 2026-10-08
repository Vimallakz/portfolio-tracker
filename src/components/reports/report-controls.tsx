"use client";

import { useRouter } from "next/navigation";
import { useId } from "react";

import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  formatMonthLong,
  formatMonthShort,
  formatQuarter,
  quarterOf,
  REPORT_TYPES,
  type ReportPeriod,
  type ReportType,
} from "@/lib/portfolio/reports/period";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<ReportType, string> = { month: "Month", quarter: "Quarter", range: "Range" };

export function ReportControls({
  period,
  months,
  quarters,
}: {
  period: ReportPeriod;
  /** Months with data, newest first. */
  months: string[];
  /** Quarters with data, newest first. */
  quarters: string[];
}) {
  const id = useId();
  const router = useRouter();

  function go(params: Record<string, string>) {
    router.push(`/reports?${new URLSearchParams(params)}`);
  }

  function switchType(type: ReportType) {
    if (type === "month") go({ type, month: period.end });
    if (type === "quarter") go({ type, quarter: quarterOf(period.end) });
    if (type === "range") go({ type, from: period.start, to: period.end });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 print:hidden">
      <div className="bg-muted flex gap-0.5 rounded-lg p-0.5" role="group" aria-label="Report type">
        {REPORT_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => switchType(type)}
            aria-pressed={period.type === type}
            className={cn(
              "focus-visible:ring-ring/50 h-7 rounded-md px-3 text-xs font-medium transition-colors outline-none focus-visible:ring-3",
              period.type === type ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {period.type === "month" ? (
        <div className="grid w-48 gap-1.5">
          <Label htmlFor={`${id}-month`} className="sr-only">
            Month
          </Label>
          <NativeSelect id={`${id}-month`} value={period.start} onChange={(event) => go({ type: "month", month: event.target.value })}>
            {months.map((month) => (
              <option key={month} value={month}>
                {formatMonthLong(month)}
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : null}

      {period.type === "quarter" ? (
        <div className="grid w-56 gap-1.5">
          <Label htmlFor={`${id}-quarter`} className="sr-only">
            Quarter
          </Label>
          <NativeSelect
            id={`${id}-quarter`}
            value={quarterOf(period.start)}
            onChange={(event) => go({ type: "quarter", quarter: event.target.value })}
          >
            {quarters.map((quarter) => (
              <option key={quarter} value={quarter}>
                {formatQuarter(quarter)}
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : null}

      {period.type === "range" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor={`${id}-from`} className="text-muted-foreground text-xs font-normal">
            From
          </Label>
          <div className="w-36">
            <NativeSelect
              id={`${id}-from`}
              value={period.start}
              onChange={(event) => go({ type: "range", from: event.target.value, to: period.end })}
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {formatMonthShort(month)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Label htmlFor={`${id}-to`} className="text-muted-foreground text-xs font-normal">
            to
          </Label>
          <div className="w-36">
            <NativeSelect
              id={`${id}-to`}
              value={period.end}
              onChange={(event) => go({ type: "range", from: period.start, to: event.target.value })}
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {formatMonthShort(month)}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
      ) : null}
    </div>
  );
}
