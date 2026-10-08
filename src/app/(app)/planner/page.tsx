import { Info, Upload } from "lucide-react";

import { Money } from "@/components/currency/money";
import { ContributionsChart } from "@/components/planner/contributions-chart";
import { PlannerStat } from "@/components/planner/planner-stat";
import { ProjectionCalculator } from "@/components/planner/projection-calculator";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SignedValue } from "@/components/shared/signed-value";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatSnapshotDate } from "@/lib/format/date";
import { formatPercentage } from "@/lib/format/number";
import { buildHistory } from "@/lib/portfolio/analytics/dashboard";
import type { EarningsSummary } from "@/lib/portfolio/planner/earnings";
import { annualizeMonthlyReturn } from "@/lib/portfolio/planner/earnings";
import { buildPlanner, RELIABLE_HISTORY_MONTHS } from "@/lib/portfolio/planner/planner";
import { listProfileSnapshots } from "@/lib/portfolio/snapshots/queries";
import { getProfileContext } from "@/lib/profiles/profile-context";

export const metadata = { title: "Planner | Portfolio Intelligence" };

const monthLong = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const formatMonth = (month: string) => monthLong.format(new Date(`${month}-01T00:00:00Z`));

function monthsNote(counted: number, window: number) {
  return counted < window ? `Per month · ${counted} of ${window} months tracked` : "Per month";
}

function EarningsStat({ label, summary, detail }: { label: string; summary: EarningsSummary | null; detail?: string }) {
  if (!summary) {
    return <PlannerStat label={label} detail="Not enough snapshots yet">—</PlannerStat>;
  }

  const returnText =
    summary.averageMonthlyReturn === null ? null : `${formatPercentage(summary.averageMonthlyReturn)} a month`;

  return (
    <PlannerStat
      label={label}
      detail={
        <SignedValue value={summary.averageMonthlyGain}>
          {[returnText, detail].filter(Boolean).join(" · ")}
        </SignedValue>
      }
    >
      <SignedValue value={summary.averageMonthlyGain}>
        <Money value={summary.averageMonthlyGain} change />
      </SignedValue>
    </PlannerStat>
  );
}

export default async function PlannerPage() {
  const { activeProfile } = await getProfileContext();

  if (!activeProfile) {
    return (
      <>
        <PageHeader title="Planner" />
        <EmptyState
          title="No profile yet"
          description="Create a profile to start tracking a portfolio."
          action={{ label: "Create profile", href: "/settings/profile" }}
        />
      </>
    );
  }

  const planner = buildPlanner(buildHistory(await listProfileSnapshots(activeProfile.id)));

  if (!planner) {
    return (
      <>
        <PageHeader title="Planner" />
        <EmptyState
          icon={Upload}
          title="No portfolio yet"
          description="Upload your first Tickertape CSV. The planner fills in as you add a snapshot each month."
          action={{ label: "Upload CSV", href: "/import" }}
        />
      </>
    );
  }

  const { latest, lastContribution, sixMonthContribution, twelveMonthContribution, earnings } = planner;

  const defaultContribution = sixMonthContribution.average ?? twelveMonthContribution.average ?? 0;
  const contributionSource =
    sixMonthContribution.average !== null
      ? "your 6-month average"
      : twelveMonthContribution.average !== null
        ? "your 12-month average"
        : "zero until a second month is tracked";

  const averageReturn = earnings.oneYear?.averageMonthlyReturn ?? earnings.allTime?.averageMonthlyReturn ?? null;
  const returnSource =
    earnings.oneYear?.averageMonthlyReturn != null
      ? "your 1-year average"
      : earnings.allTime?.averageMonthlyReturn != null
        ? "your all-time average"
        : "about 10% a year, used until your own returns are measured";

  const measuredMonths = earnings.allTime?.monthsCovered ?? 0;

  return (
    <>
      <PageHeader
        title="Investment planner"
        description={`How much you invest, what it earns, and where it leads · As of ${formatSnapshotDate(latest.snapshotDate)}`}
      />

      <div className="grid gap-6">
        {measuredMonths < RELIABLE_HISTORY_MONTHS ? (
          <Alert>
            <Info />
            <AlertTitle>Averages get more reliable with more months</AlertTitle>
            <AlertDescription>
              {measuredMonths === 0
                ? "There is only one month of snapshots so far."
                : `Only ${measuredMonths} ${measuredMonths === 1 ? "month is" : "months are"} measured so far.`}{" "}
              Upload a CSV near each month-end and these numbers will settle.
            </AlertDescription>
          </Alert>
        ) : null}

        <section aria-labelledby="habit-heading" className="grid gap-3">
          <h2 id="habit-heading" className="text-sm font-semibold">
            How much you invest
          </h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <PlannerStat
              label="Last month"
              detail={
                lastContribution
                  ? `${formatMonth(lastContribution.month)}${lastContribution.isEstimated ? " · Estimated" : ""}`
                  : "Needs a second month"
              }
            >
              {lastContribution ? <Money value={lastContribution.amount} /> : "—"}
            </PlannerStat>
            <PlannerStat label="6-month average" detail={monthsNote(sixMonthContribution.monthsCounted, 6)}>
              <Money value={sixMonthContribution.average} />
            </PlannerStat>
            <PlannerStat label="12-month average" detail={monthsNote(twelveMonthContribution.monthsCounted, 12)}>
              <Money value={twelveMonthContribution.average} />
            </PlannerStat>
            <PlannerStat label="Total invested" detail="Cost basis of current holdings">
              <Money value={latest.investedAmount} />
            </PlannerStat>
          </div>
          <ContributionsChart months={planner.contributions} sixMonthAverage={sixMonthContribution.average} />
        </section>

        <section aria-labelledby="earnings-heading" className="grid gap-3">
          <div>
            <h2 id="earnings-heading" className="text-sm font-semibold">
              What it earns
            </h2>
            <p className="text-muted-foreground text-xs">
              Average market gain per month for the whole portfolio, excluding money you added. The % is weighted by
              how much money was invested each month, so it always agrees with your actual profit or loss.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <EarningsStat label="Last month" summary={earnings.lastMonth} />
            <EarningsStat label="6-month average" summary={earnings.sixMonths} />
            <EarningsStat label="1-year average" summary={earnings.oneYear} />
            <EarningsStat
              label="All-time average"
              summary={earnings.allTime}
              detail={
                earnings.allTime?.averageMonthlyReturn != null
                  ? `${formatPercentage(annualizeMonthlyReturn(earnings.allTime.averageMonthlyReturn), 1)} a year`
                  : undefined
              }
            />
          </div>
        </section>

        <ProjectionCalculator
          currentValue={latest.currentValue}
          investedAmount={latest.investedAmount}
          defaultContribution={defaultContribution}
          contributionSource={contributionSource}
          averageReturn={averageReturn}
          returnSource={returnSource}
        />
      </div>
    </>
  );
}
