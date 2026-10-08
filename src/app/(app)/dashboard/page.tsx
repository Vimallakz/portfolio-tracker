import { Upload } from "lucide-react";

import { AllocationCard } from "@/components/dashboard/allocation-card";
import { LargestHoldingsCard } from "@/components/dashboard/largest-holdings-card";
import { MonthlyPerformanceCard } from "@/components/dashboard/monthly-performance-card";
import { PerformersCard } from "@/components/dashboard/performers-card";
import { PlannerTeaserCard } from "@/components/dashboard/planner-teaser-card";
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { PortfolioValueChart } from "@/components/dashboard/portfolio-value-chart";
import { SincePreviousCard } from "@/components/dashboard/since-previous-card";
import { TypeFilter } from "@/components/dashboard/type-filter";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { formatSnapshotDate } from "@/lib/format/date";
import { buildDashboard, buildHistory, parseTypeFilter } from "@/lib/portfolio/analytics/dashboard";
import { buildPlanner } from "@/lib/portfolio/planner/planner";
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
  const snapshots = await listProfileSnapshots(activeProfile.id);
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
          <PortfolioSummary summary={dashboard.summary} />

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <PortfolioValueChart history={dashboard.history} />
            </div>
            <div className="grid content-start gap-4">
              <AllocationCard allocation={dashboard.allocation} />
              <SincePreviousCard change={dashboard.sincePrevious} />
              {planner ? <PlannerTeaserCard planner={planner} /> : null}
            </div>
          </div>

          <MonthlyPerformanceCard history={dashboard.history} />

          <div className="grid gap-4 md:grid-cols-2">
            <PerformersCard
              title="Top performers"
              description="Highest portfolio return (P&L %) among holdings in profit."
              emptyMessage="No holdings are in profit in the latest snapshot."
              performers={dashboard.topPerformers}
            />
            <PerformersCard
              title="Worst performers"
              description="Lowest portfolio return (P&L %) among holdings at a loss."
              emptyMessage="No holdings are at a loss in the latest snapshot."
              performers={dashboard.worstPerformers}
            />
          </div>

          <LargestHoldingsCard holdings={dashboard.largestHoldings} />
        </div>
      )}
    </>
  );
}
