import { Upload } from "lucide-react";
import { Suspense } from "react";

import { MarketComparisonSection } from "@/components/benchmark/market-comparison-section";
import { LargestHoldingsCard } from "@/components/dashboard/largest-holdings-card";
import { MonthlyPerformanceCard } from "@/components/dashboard/monthly-performance-card";
import { NeedsAttentionCard, NeedsAttentionSkeleton } from "@/components/dashboard/needs-attention-card";
import { PerformersCard } from "@/components/dashboard/performers-card";
import { PlannerTeaserCard } from "@/components/dashboard/planner-teaser-card";
import { PortfolioHero } from "@/components/dashboard/portfolio-hero";
import { PortfolioValueChart } from "@/components/dashboard/portfolio-value-chart";
import { SinceLastSnapshotCard } from "@/components/dashboard/since-last-snapshot-card";
import { TypeFilter } from "@/components/dashboard/type-filter";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { TabbedCard } from "@/components/shared/tabbed-card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatSnapshotDate } from "@/lib/format/date";
import { buildDashboard, buildHistory, parseTypeFilter } from "@/lib/portfolio/analytics/dashboard";
import { evaluateGoal } from "@/lib/portfolio/planner/goal";
import { getGoal } from "@/lib/portfolio/planner/goal-queries";
import { buildPlanner, planPace } from "@/lib/portfolio/planner/planner";
import { listProfileSnapshots } from "@/lib/portfolio/snapshots/queries";
import { getProfileContext } from "@/lib/profiles/profile-context";

export const metadata = { title: "Dashboard | Portfolio Intelligence" };

const FILTER_NOUN = { ALL: "holdings", STOCK: "stocks", ETF: "ETFs" } as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { activeProfile } = await getProfileContext();

  if (!activeProfile) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <EmptyState
          title="No profile yet"
          description="Create a profile to start tracking a portfolio. Each profile keeps its own holdings, snapshots and research."
          action={{ label: "Create profile", href: "/settings/profile" }}
        />
      </>
    );
  }

  const filter = parseTypeFilter((await searchParams).type);
  const [snapshots, goal] = await Promise.all([listProfileSnapshots(activeProfile.id), getGoal(activeProfile.id)]);
  const dashboard = buildDashboard(snapshots, filter);
  const planner = buildPlanner(buildHistory(snapshots));

  if (!dashboard) {
    return (
      <>
        <PageHeader title={`${activeProfile.name} Portfolio`} />
        <EmptyState
          icon={Upload}
          title="No portfolio yet"
          description="Upload your first Tickertape CSV to start tracking your portfolio."
          action={{ label: "Upload CSV", href: "/import" }}
        />
      </>
    );
  }

  const isEmptySelection = dashboard.summary.holdingCount === 0;
  const pace = planner ? planPace(planner) : null;
  const goalSummary =
    goal && planner && pace
      ? {
          goal,
          evaluation: evaluateGoal({
            goal,
            startValue: planner.latest.currentValue,
            startInvested: planner.latest.investedAmount,
            monthlyContribution: pace.contribution,
            monthlyReturn: pace.monthlyReturn,
            asOf: planner.latest.snapshotDate,
          }),
          monthlyContribution: pace.contribution,
        }
      : null;

  return (
    <>
      <PageHeader
        title={`${activeProfile.name} Portfolio`}
        description={`As of ${formatSnapshotDate(dashboard.latestSnapshotDate)} · ${dashboard.snapshotCount} ${dashboard.snapshotCount === 1 ? "snapshot" : "snapshots"}`}
        actions={<TypeFilter value={filter} />}
      />

      {isEmptySelection ? (
        <EmptyState
          title={`No ${FILTER_NOUN[filter]} in the latest snapshot`}
          description="Switch the filter to see the rest of the portfolio."
          action={{ label: "Show all holdings", href: "/dashboard" }}
        />
      ) : (
        <div className="grid gap-4">
          <PortfolioHero summary={dashboard.summary} allocation={dashboard.allocation} history={dashboard.history} />

          <div className="grid gap-4 md:grid-cols-3">
            <Suspense fallback={<NeedsAttentionSkeleton />}>
              <NeedsAttentionCard profileId={activeProfile.id} />
            </Suspense>
            <SinceLastSnapshotCard change={dashboard.sincePrevious} />
            {planner ? (
              <PlannerTeaserCard planner={planner} goal={goalSummary} />
            ) : null}
          </div>

          <TabbedCard
            title="Performance"
            storageKey="pit:dashboard-performance-tab"
            defaultTab="growth"
            tabs={[
              { id: "growth", label: "Growth", content: <PortfolioValueChart history={dashboard.history} embedded /> },
              { id: "monthly", label: "Monthly", content: <MonthlyPerformanceCard history={dashboard.history} embedded /> },
              {
                id: "market",
                label: "vs Market",
                content: (
                  <Suspense fallback={<Skeleton className="h-72" />}>
                    <MarketComparisonSection history={dashboard.history} embedded />
                  </Suspense>
                ),
              },
            ]}
          />

          <TabbedCard
            title="Holdings"
            storageKey="pit:dashboard-holdings-tab"
            defaultTab="largest"
            tabs={[
              {
                id: "largest",
                label: "Largest",
                content: <LargestHoldingsCard holdings={dashboard.largestHoldings} embedded />,
              },
              {
                id: "top",
                label: "Top performers",
                content: (
                  <PerformersCard
                    title="Top performers"
                    description="Highest return (P&L %) among holdings in profit."
                    emptyMessage="No holdings are in profit in the latest snapshot."
                    performers={dashboard.topPerformers}
                    embedded
                  />
                ),
              },
              {
                id: "worst",
                label: "Worst performers",
                content: (
                  <PerformersCard
                    title="Worst performers"
                    description="Lowest return (P&L %) among holdings at a loss."
                    emptyMessage="No holdings are at a loss in the latest snapshot."
                    performers={dashboard.worstPerformers}
                    embedded
                  />
                ),
              },
            ]}
          />
        </div>
      )}
    </>
  );
}
