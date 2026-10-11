import { SignedValue } from "@/components/shared/signed-value";
import { formatPercentage } from "@/lib/format/number";
import { monthsSpanned, type MoneyWeightedReturn } from "@/lib/portfolio/analytics/xirr";
import { cn } from "@/lib/utils";

/** Under a year of history the yearly rate is magnified, so say it is an early estimate and over how long. */
export function yearlyReturnNote(result: MoneyWeightedReturn): string {
  if (result.coversAYear) return "XIRR · your yearly pace";

  const months = monthsSpanned(result);
  return `XIRR · early estimate from ${months} ${months === 1 ? "month" : "months"}`;
}

/** The XIRR as "+8.12% a year", with what it is and how far to trust it. */
export function YearlyReturn({ result, className }: { result: MoneyWeightedReturn; className?: string }) {
  return (
    <span className={cn("tabular-nums", className)}>
      <SignedValue value={result.annualReturn} className="font-semibold">
        {formatPercentage(result.annualReturn)} a year
      </SignedValue>{" "}
      <span className="text-muted-foreground">{yearlyReturnNote(result)}</span>
    </span>
  );
}
