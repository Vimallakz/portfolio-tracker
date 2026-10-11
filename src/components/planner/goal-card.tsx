import { formatMonthLabel } from "@/components/benchmark/market-comparison-summary";
import { Money } from "@/components/currency/money";
import { GoalPanel } from "@/components/planner/goal-form";
import { Stat, StatStrip } from "@/components/shared/stat-strip";
import { addMonths } from "@/lib/portfolio/analytics/monthly-performance";
import { monthOf } from "@/lib/portfolio/planner/contributions";
import type { GoalEvaluation, GoalStatus, InvestmentGoal } from "@/lib/portfolio/planner/goal";
import { cn } from "@/lib/utils";

/** A new goal defaults to three years out. */
const DEFAULT_GOAL_YEARS = 3;

export const GOAL_STATUS: Record<GoalStatus, { label: string; className: string }> = {
  reached: { label: "Reached", className: "bg-positive/15 text-positive" },
  ahead: { label: "Ahead", className: "bg-positive/15 text-positive" },
  "on-track": { label: "On track", className: "bg-primary/10 text-primary" },
  behind: { label: "Behind", className: "bg-negative/15 text-negative" },
  missed: { label: "Missed", className: "bg-negative/15 text-negative" },
};

const percent = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  const { label, className } = GOAL_STATUS[status];
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", className)}>{label}</span>;
}

export function GoalProgressBar({ progress, className }: { progress: number; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-label="Goal progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      className={cn("bg-muted h-2 overflow-hidden rounded-full", className)}
    >
      <div className="bg-primary h-full rounded-full" style={{ width: `${progress}%` }} />
    </div>
  );
}

const monthsText = (months: number) => {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [years ? `${years} ${years === 1 ? "year" : "years"}` : "", rest ? `${rest} ${rest === 1 ? "month" : "months"}` : ""];
  return parts.filter(Boolean).join(" ") || "this month";
};

export function GoalCard({
  goal,
  evaluation,
  currentValue,
  monthlyContribution,
  asOf,
}: {
  goal: InvestmentGoal | null;
  evaluation: GoalEvaluation | null;
  currentValue: number;
  /** The planner's pace, for comparison with the amount needed. */
  monthlyContribution: number;
  /** "YYYY-MM-DD" of the latest snapshot. */
  asOf: string;
}) {
  const defaultMonth = addMonths(monthOf(asOf), DEFAULT_GOAL_YEARS * 12);

  if (!goal || !evaluation) {
    return (
      <GoalPanel
        goal={null}
        defaultMonth={defaultMonth}
        description="Set a target amount and date to see whether your current pace gets you there."
      >
        <p className="text-muted-foreground text-sm">
          For example a house deposit or a round number like $10,000 by a date. The planner then tells you if you are
          on track, how much to invest each month, and when you would reach it.
        </p>
      </GoalPanel>
    );
  }

  const targetLabel = formatMonthLabel(goal.targetMonth);
  const due = evaluation.monthsLeft <= 0;
  const needed = evaluation.requiredMonthly;

  return (
    <GoalPanel
      goal={goal}
      defaultMonth={defaultMonth}
      description={
        <>
          {goal.name} · <Money value={goal.targetAmount} /> by {targetLabel}
          {goal.inflationRate ? ` · plus ${goal.inflationRate}% a year inflation` : null}
        </>
      }
    >
      <div className="grid gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm tabular-nums">
            <span className="text-2xl font-semibold tracking-tight">
              <Money value={currentValue} />
            </span>{" "}
            <span className="text-muted-foreground">
              of <Money value={evaluation.targetAtDate} /> · {percent.format(evaluation.progress)}%
            </span>
          </p>
          <GoalStatusBadge status={evaluation.status} />
        </div>
        <GoalProgressBar progress={evaluation.progress} />
      </div>

      <StatStrip>
        <Stat
          label={due ? `Value in ${targetLabel}` : `By ${targetLabel} at your pace`}
          detail={
            <span className={evaluation.gap >= 0 ? "text-positive" : "text-negative"}>
              <Money value={Math.abs(evaluation.gap)} /> {evaluation.gap >= 0 ? "more than the target" : "short"}
            </span>
          }
        >
          <Money value={evaluation.projectedAtDate} />
        </Stat>
        <Stat
          label="Needed each month"
          detail={
            needed === null ? (
              "The target month has passed"
            ) : needed <= monthlyContribution ? (
              <>
                You invest <Money value={monthlyContribution} />, so you could invest less
              </>
            ) : (
              <>
                You invest <Money value={monthlyContribution} />: <Money value={needed - monthlyContribution} /> more
              </>
            )
          }
        >
          {needed === null ? "—" : <Money value={needed} />}
        </Stat>
        <Stat
          label="At your pace you reach it"
          detail={due ? "Due now" : `${monthsText(evaluation.monthsLeft)} left to ${targetLabel}`}
        >
          {evaluation.reachMonth ? formatMonthLabel(evaluation.reachMonth) : "Not within 50 years"}
        </Stat>
        <Stat
          label="Target then"
          detail={
            goal.inflationRate ? (
              <>
                <Money value={goal.targetAmount} /> today at {goal.inflationRate}% a year
              </>
            ) : (
              "No inflation added"
            )
          }
        >
          <Money value={evaluation.targetAtDate} />
        </Stat>
      </StatStrip>
    </GoalPanel>
  );
}
