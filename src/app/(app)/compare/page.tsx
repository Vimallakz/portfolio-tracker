import { GitCompareArrows } from "lucide-react";

import { ComparePicker } from "@/components/history/compare-picker";
import { ComparisonSummaryCard } from "@/components/history/comparison-summary-card";
import { HoldingChangesTable } from "@/components/history/holding-changes-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { formatSnapshotDate } from "@/lib/format/date";
import { diffSnapshots, resolveComparisonPair } from "@/lib/portfolio/history/history";
import { listProfileSnapshots } from "@/lib/portfolio/snapshots/queries";
import { getProfileContext } from "@/lib/profiles/profile-context";

export const metadata = { title: "Compare | Portfolio Intelligence" };

const DESCRIPTION = "Pick two snapshots to see how the portfolio and each holding changed between them.";

const firstParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [params, { activeProfile }] = await Promise.all([searchParams, getProfileContext()]);
  const snapshots = activeProfile ? await listProfileSnapshots(activeProfile.id) : [];
  const pair = resolveComparisonPair(snapshots, firstParam(params.from), firstParam(params.to));

  if (!pair) {
    return (
      <>
        <PageHeader title="Compare snapshots" description={DESCRIPTION} />
        <EmptyState
          icon={GitCompareArrows}
          title="Not enough snapshots"
          description={
            snapshots.length === 1
              ? "You have one snapshot so far. Import a CSV for another date, such as next month, and you can compare the two here."
              : "Comparison needs at least two snapshots. Import a CSV in two different months to compare them."
          }
          action={{ label: "Import CSV", href: "/import" }}
        />
      </>
    );
  }

  const { from, to } = pair;
  const options = snapshots.map((s) => ({ id: s.id, snapshotDate: s.snapshotDate, holdingCount: s.holdings.length }));

  if (from.id === to.id) {
    return (
      <>
        <PageHeader title="Compare snapshots" description={DESCRIPTION} />
        <ComparePicker snapshots={options} fromId={from.id} toId={to.id} />
        <EmptyState
          icon={GitCompareArrows}
          title="Pick two different snapshots"
          description={`Both sides are ${formatSnapshotDate(from.snapshotDate)}. Choose another date for one of them.`}
        />
      </>
    );
  }

  const diff = diffSnapshots(from, to);

  return (
    <>
      <PageHeader title="Compare snapshots" description={DESCRIPTION} />
      <ComparePicker snapshots={options} fromId={from.id} toId={to.id} />

      <div className="grid gap-4">
        <ComparisonSummaryCard
          fromDate={from.snapshotDate}
          toDate={to.snapshotDate}
          before={diff.before!}
          after={diff.after}
          summary={diff.summary}
        />
        <HoldingChangesTable
          title="Security changes"
          description={`Figures are from ${formatSnapshotDate(to.snapshotDate)}; small numbers below show the change since ${formatSnapshotDate(from.snapshotDate)}. Removed holdings show their last known figures.`}
          holdings={diff.holdings}
        />
      </div>
    </>
  );
}
