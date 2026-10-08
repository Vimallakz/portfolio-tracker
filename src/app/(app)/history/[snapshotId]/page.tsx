import { ArrowLeft, Download, GitCompareArrows } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AllocationCard } from "@/components/dashboard/allocation-card";
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { SincePreviousCard } from "@/components/dashboard/since-previous-card";
import { DeleteSnapshotButton } from "@/components/history/delete-snapshot-button";
import { HoldingChangesTable } from "@/components/history/holding-changes-table";
import { Button } from "@/components/ui/button";
import { formatSnapshotDate } from "@/lib/format/date";
import { calculateAllocation, calculateSincePrevious, summarizePortfolio } from "@/lib/portfolio/analytics/dashboard";
import { diffSnapshots } from "@/lib/portfolio/history/history";
import { listProfileSnapshots } from "@/lib/portfolio/snapshots/queries";
import { getProfileContext } from "@/lib/profiles/profile-context";

export const metadata = { title: "Snapshot | Portfolio Intelligence" };

export default async function SnapshotPage({ params }: { params: Promise<{ snapshotId: string }> }) {
  const [{ snapshotId }, { activeProfile }] = await Promise.all([params, getProfileContext()]);
  const snapshots = activeProfile ? await listProfileSnapshots(activeProfile.id) : [];
  const index = snapshots.findIndex((s) => s.id === snapshotId);

  if (index === -1) {
    notFound();
  }

  const snapshot = snapshots[index];
  const previous = snapshots[index - 1] ?? null;
  const date = formatSnapshotDate(snapshot.snapshotDate);
  const diff = diffSnapshots(previous, snapshot);
  const position = `Snapshot ${index + 1} of ${snapshots.length}`;

  return (
    <>
      <div className="grid gap-3 pb-6">
        <Link href="/history" className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm">
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          History
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{date}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {snapshot.fileName ? `${position} · ${snapshot.fileName}` : position}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {previous ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/compare?from=${previous.id}&to=${snapshot.id}`}>
                  <GitCompareArrows />
                  Compare with previous
                </Link>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="outline">
              <a href={`/history/${snapshot.id}/csv`} download>
                <Download />
                Download CSV
              </a>
            </Button>
            <DeleteSnapshotButton snapshotId={snapshot.id} label={date} holdingCount={snapshot.holdings.length} />
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <PortfolioSummary summary={summarizePortfolio(snapshot.holdings)} />

        <div className="grid gap-4 md:grid-cols-2">
          <SincePreviousCard
            change={previous ? calculateSincePrevious(previous, snapshot) : null}
            emptyMessage={
              snapshots.length > 1
                ? "This is the first snapshot, so there is nothing earlier to compare with."
                : "Upload another snapshot to see what changed."
            }
          />
          <AllocationCard allocation={calculateAllocation(snapshot.holdings)} />
        </div>

        <HoldingChangesTable
          title="Holdings"
          description={
            previous
              ? `As reported on ${date}. Changes are against ${formatSnapshotDate(previous.snapshotDate)}; holdings sold since then are listed as removed.`
              : `As reported on ${date}. This is the first snapshot, so every holding is new.`
          }
          holdings={diff.holdings}
          defaultSort={{ key: "weight", direction: "desc" }}
        />
      </div>
    </>
  );
}
