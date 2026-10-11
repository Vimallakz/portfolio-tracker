import { Info, Upload } from "lucide-react";
import { Suspense } from "react";

import { MarketTilesSection, MarketTilesSkeleton } from "@/components/benchmark/market-comparison-section";
import { Money } from "@/components/currency/money";
import { ContributionsChart } from "@/components/planner/contributions-chart";
import { PlannerHero } from "@/components/planner/planner-hero";
import { ProjectionCalculator } from "@/components/planner/projection-calculator";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SignedValue } from "@/components/shared/signed-value";
import { Stat, StatStrip } from "@/components/shared/stat-strip";
import { TabbedCard } from "@/components/shared/tabbed-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatSnapshotDate } from "@/lib/format/date";
import { formatPercentage } from "@/lib/format/number";
import { buildHistory } from "@/lib/portfolio/analytics/dashboard";
import { addMonths } from "@/lib/portfolio/analytics/monthly-performance";
import { calculateMoneyWeightedReturn } from "@/lib/portfolio/analytics/xirr";
import { sinceStartReturn, type YourPeriodReturn } from "@/lib/portfolio/benchmark/benchmark";
import type { EarningsSummary } from "@/lib/portfolio/planner/earnings";
import { annualizeMonthlyReturn } from "@/lib/portfolio/planner/earnings";
import { buildPlanner, RELIABLE_HISTORY_MONTHS } from "@/lib/portfolio/planner/planner";
import { DEFAULT_PLAN_YEARS, planReturn, projectInvestment } from "@/lib/portfolio/planner/projection";
import { listProfileSnapshots } from "@/lib/portfolio/snapshots/queries";
import { getProfileContext } from "@/lib/profiles/profile-context";

export const metadata = { title: "Planner | Portfolio Intelligence" };

const monthLong = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const formatMonth = (month: string) => monthLong.format(new Date(`${month}-01T00:00:00Z`));

function monthsNote(counted: number, window: number) {
  return counted < window ? `Per month · ${counted} of ${window} months tracked` : "Per month";
}

/** The same since-start return the market comparison uses, so the two never disagree. */
function sinceStartNote(result: YourPeriodReturn) {
  return result.yourReturn === null
    ? undefined
    : `${formatPercentage(result.yourReturn)} since ${formatMonth(addMonths(result.fromMonth, 1))}`;
}

function EarningsStat({ label, summary, detail }: { label: string; summary: EarningsSummary | null; detail?: string }) {
  if (!summary) {
    return (
      <Stat label={label} detail="Not enough snapshots yet">
        —
      </Stat>
    );
  }

  const returnText =
    summary.averageMonthlyReturn === null ? null : `${formatPercentage(summary.averageMonthlyReturn)} a month`;

  return (
    <Stat
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
    </Stat>
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

  const history = buildHistory(await listProfileSnapshots(activeProfile.id));
  const planner = buildPlanner(history);
  const sinceStart = sinceStartReturn(history);

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
  const contribution = Math.max(0, defaultContribution);
  const monthlyReturn = planReturn(averageReturn);
  const projection = projectInvestment({
    startValue: latest.currentValue,
    startInvested: latest.investedAmount,
    monthlyContribution: contribution,
    monthlyReturn,
    months: DEFAULT_PLAN_YEARS * 12,
    stepUp: null,
  });

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

        <PlannerHero
          years={DEFAULT_PLAN_YEARS}
          projection={projection}
          contribution={contribution}
          contributionSource={contributionSource}
          monthlyReturn={monthlyReturn}
          returnSource={returnSource}
          investedAmount={latest.investedAmount}
          sinceStart={sinceStart}
          yearly={calculateMoneyWeightedReturn(history)}
          history={history}
        />

        <TabbedCard
          title="Your track record"
          description="The habits the plan is built on."
          storageKey="pit:planner-track-record-tab"
          defaultTab="invest"
          tabs={[
            {
              id: "invest",
              label: "How much you invest",
              content: (
                <div className="grid gap-5">
                  <StatStrip>
                    <Stat
                      label="Last month"
                      detail={
                        lastContribution
                          ? `${formatMonth(lastContribution.month)}${lastContribution.isEstimated ? " · Estimated" : ""}`
                          : "Needs a second month"
                      }
                    >
                      {lastContribution ? <Money value={lastContribution.amount} /> : "—"}
                    </Stat>
                    <Stat label="6-month average" detail={monthsNote(sixMonthContribution.monthsCounted, 6)}>
                      <Money value={sixMonthContribution.average} />
                    </Stat>
                    <Stat label="12-month average" detail={monthsNote(twelveMonthContribution.monthsCounted, 12)}>
                      <Money value={twelveMonthContribution.average} />
                    </Stat>
                    <Stat label="Total invested" detail="Cost basis of current holdings">
                      <Money value={latest.investedAmount} />
                    </Stat>
                  </StatStrip>
                  <ContributionsChart
                    months={planner.contributions}
                    sixMonthAverage={sixMonthContribution.average}
                    embedded
                  />
                </div>
              ),
            },
            {
              id: "earn",
              label: "What it earns",
              content: (
                <div className="grid gap-4">
                  <p className="text-muted-foreground text-sm">
                    Average market gain per month for the whole portfolio, excluding money you added. The % is weighted
                    by how much money was invested each month, so it always agrees with your actual profit or loss.
                  </p>
                  <StatStrip>
                    <EarningsStat label="Last month" summary={earnings.lastMonth} />
                    <EarningsStat label="6-month average" summary={earnings.sixMonths} />
                    <EarningsStat label="1-year average" summary={earnings.oneYear} />
                    <EarningsStat
                      label="All-time average"
                      summary={earnings.allTime}
                      detail={
                        sinceStart
                          ? sinceStartNote(sinceStart)
                          : earnings.allTime?.averageMonthlyReturn != null
                            ? `${formatPercentage(annualizeMonthlyReturn(earnings.allTime.averageMonthlyReturn), 1)} a year`
                            : undefined
                      }
                    />
                  </StatStrip>
                </div>
              ),
            },
            {
              id: "market",
              label: "vs Market",
              content: (
                <div className="grid gap-4">
                  <p className="text-muted-foreground text-sm">
                    Your return since the start of your first snapshot&apos;s month, as if that money went in on day
                    one, against the S&amp;P 500 and Nasdaq 100 bought at the previous month&apos;s last close and held
                    to the latest month&apos;s last close.
                  </p>
                  <Suspense fallback={<MarketTilesSkeleton />}>
                    <MarketTilesSection history={history} />
                  </Suspense>
                </div>
              ),
            },
          ]}
        />

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
