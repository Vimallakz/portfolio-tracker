import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { formatMonthLabel } from "@/components/benchmark/market-comparison-summary";
import { Money } from "@/components/currency/money";
import { GoalProgressBar, GoalStatusBadge } from "@/components/planner/goal-card";
import { SignedValue } from "@/components/shared/signed-value";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercentage } from "@/lib/format/number";
import type { GoalEvaluation, InvestmentGoal } from "@/lib/portfolio/planner/goal";
import type { PlannerData } from "@/lib/portfolio/planner/planner";

const percent = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function PlannerLink({ children }: { children: React.ReactNode }) {
  return (
    <Link
      href="/planner"
      className="text-primary inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
    >
      {children}
      <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
  );
}

function GoalTeaser({
  goal,
  evaluation,
  monthlyContribution,
}: {
  goal: InvestmentGoal;
  evaluation: GoalEvaluation;
  monthlyContribution: number;
}) {
  const needed = evaluation.requiredMonthly;

  return (
    <Card size="sm" className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="truncate">{goal.name}</span>
          <GoalStatusBadge status={evaluation.status} />
        </CardTitle>
        <CardDescription>
          <Money value={evaluation.targetAtDate} /> by {formatMonthLabel(goal.targetMonth)}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid flex-1 content-between gap-3">
        <div className="grid gap-1.5">
          <GoalProgressBar progress={evaluation.progress} />
          <p className="text-muted-foreground text-xs tabular-nums">{percent.format(evaluation.progress)}% there</p>
        </div>
        <p className="text-sm tabular-nums">
          {needed === null ? (
            <span className="text-muted-foreground">The target month has passed.</span>
          ) : (
            <>
              <span className="text-muted-foreground">Needs</span>{" "}
              <span className="font-semibold">
                <Money value={needed} />
              </span>
              <span className="text-muted-foreground">/mo · you invest </span>
              <Money value={monthlyContribution} />
            </>
          )}
        </p>
        <PlannerLink>Open planner</PlannerLink>
      </CardContent>
    </Card>
  );
}

export function PlannerTeaserCard({
  planner,
  goal,
}: {
  planner: PlannerData;
  /** The profile's goal, evaluated at the planner's pace. Null when none is set. */
  goal: { goal: InvestmentGoal; evaluation: GoalEvaluation; monthlyContribution: number } | null;
}) {
  if (goal) {
    return <GoalTeaser {...goal} />;
  }

  const contribution = planner.sixMonthContribution.average ?? planner.twelveMonthContribution.average;
  const earnings = planner.earnings.sixMonths ?? planner.earnings.allTime;

  return (
    <Card size="sm" className="h-full">
      <CardHeader>
        <CardTitle>Investment plan</CardTitle>
        <CardDescription>Recent monthly averages for the whole portfolio.</CardDescription>
      </CardHeader>
      <CardContent className="grid flex-1 content-between gap-3">
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
        <PlannerLink>Set a goal in the planner</PlannerLink>
      </CardContent>
    </Card>
  );
}
