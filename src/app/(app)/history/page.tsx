import { GitCompareArrows, Info, Upload } from "lucide-react";
import Link from "next/link";

import { HistoryTable } from "@/components/history/history-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { buildHistoryEntries } from "@/lib/portfolio/history/history";
import { listProfileSnapshots } from "@/lib/portfolio/snapshots/queries";
import { getProfileContext } from "@/lib/profiles/profile-context";

export const metadata = { title: "History | Portfolio Intelligence" };

const DESCRIPTION = "Every confirmed import is saved as a snapshot of your portfolio on that date.";

export default async function HistoryPage() {
  const { activeProfile } = await getProfileContext();

  if (!activeProfile) {
    return (
      <>
        <PageHeader title="History" description={DESCRIPTION} />
        <EmptyState
          title="No profile yet"
          description="Create a profile to start tracking a portfolio. Each profile keeps its own snapshots."
          action={{ label: "Create profile", href: "/settings/profile" }}
        />
      </>
    );
  }

  const entries = buildHistoryEntries(await listProfileSnapshots(activeProfile.id));

  if (entries.length === 0) {
    return (
      <>
        <PageHeader title="History" description={DESCRIPTION} />
        <EmptyState
          icon={Upload}
          title="No snapshots yet"
          description="Each Tickertape CSV you import is saved here as a snapshot. Import one every month to see what you held on any date, what you bought, added or sold since the previous month, and to compare any two months."
          action={{ label: "Import CSV", href: "/import" }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="History"
        description={`${DESCRIPTION} Open one to see its holdings, or compare two to see what changed.`}
        actions={
          <>
            {entries.length > 1 ? (
              <Button asChild size="sm" variant="outline">
                <Link href="/compare">
                  <GitCompareArrows />
                  Compare
                </Link>
              </Button>
            ) : null}
            <Button asChild size="sm">
              <Link href="/import">
                <Upload />
                Import CSV
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4">
        {entries.length === 1 ? (
          <Alert>
            <Info />
            <AlertTitle>One snapshot so far</AlertTitle>
            <AlertDescription>
              Import your next Tickertape CSV (for example, next month) to see what changed since this one and to compare
              snapshots.
            </AlertDescription>
          </Alert>
        ) : null}
        <HistoryTable entries={entries} />
      </div>
    </>
  );
}
