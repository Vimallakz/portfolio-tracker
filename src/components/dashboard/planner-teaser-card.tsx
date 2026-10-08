import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Money } from "@/components/currency/money";
import { SignedValue } from "@/components/shared/signed-value";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercentage } from "@/lib/format/number";
import type { PlannerData } from "@/lib/portfolio/planner/planner";

export function PlannerTeaserCard({ planner }: { planner: PlannerData }) {
  const contribution = planner.sixMonthContribution.average ?? planner.twelveMonthContribution.average;
  const earnings = planner.earnings.sixMonths ?? planner.earnings.allTime;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Investment plan</CardTitle>
        <CardDescription>Recent monthly averages for the whole portfolio.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Avg invested</dt>
            <dd className="font-semibold tabular-nums">
              {contribution === null ? "—" : <><Money value={contribution} /><span className="text-muted-foreground text-xs font-normal">/mo</span></>}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Avg return</dt>
            <dd className="font-semibold tabular-nums">
              {earnings?.averageMonthlyReturn == null ? (
                "—"
              ) : (
                <SignedValue value={earnings.averageMonthlyReturn}>
                  {formatPercentage(earnings.averageMonthlyReturn)}
                  <span className="text-xs font-normal">/mo</span>
                </SignedValue>
              )}
            </dd>
          </div>
        </dl>
        <Link
          href="/planner"
          className="text-primary inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
        >
          Open planner
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}
