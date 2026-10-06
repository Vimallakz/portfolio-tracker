import { Money } from "@/components/currency/money";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AllocationSlice } from "@/lib/portfolio/analytics/dashboard";

const LABELS = { STOCK: "Stocks", ETF: "ETFs" } as const;
const BAR_CLASS = { STOCK: "bg-foreground", ETF: "bg-muted-foreground" } as const;

const percent = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export function AllocationCard({ allocation }: { allocation: AllocationSlice[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Allocation</CardTitle>
        <CardDescription>Share of current value across the whole portfolio.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {allocation.map((slice) => (
          <div key={slice.type} className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">
                {LABELS[slice.type]}{" "}
                <span className="text-muted-foreground text-xs font-normal">({slice.holdingCount})</span>
              </span>
              <span className="tabular-nums">
                {percent.format(slice.percentage)}%
                <span className="text-muted-foreground ml-2 text-xs"><Money value={slice.currentValue} /></span>
              </span>
            </div>
            <div
              className="bg-muted h-2 overflow-hidden rounded-full"
              role="meter"
              aria-label={`${LABELS[slice.type]} allocation`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(slice.percentage)}
            >
              <div className={`h-full rounded-full ${BAR_CLASS[slice.type]}`} style={{ width: `${slice.percentage}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
