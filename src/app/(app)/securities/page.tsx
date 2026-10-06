import { AlertTriangle, Upload } from "lucide-react";
import Link from "next/link";

import { SecurityTable } from "@/components/securities/security-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatSnapshotDate } from "@/lib/format/date";
import { listSecurityRows } from "@/lib/portfolio/securities/queries";
import { getProfileContext } from "@/lib/profiles/profile-context";
import { listTags } from "@/lib/tags/queries";

export const metadata = { title: "Securities | Portfolio Intelligence" };

export default async function SecuritiesPage() {
  const { activeProfile } = await getProfileContext();

  if (!activeProfile) {
    return (
      <>
        <PageHeader title="Securities" />
        <EmptyState
          title="No profile yet"
          description="Create a profile to start tracking a portfolio."
          action={{ label: "Create profile", href: "/settings/profile" }}
        />
      </>
    );
  }

  const [list, tags] = await Promise.all([listSecurityRows(activeProfile.id), listTags(activeProfile.id)]);

  if (!list || list.rows.length === 0) {
    return (
      <>
        <PageHeader title="Securities" />
        <EmptyState
          icon={Upload}
          title="No securities yet"
          description="Securities appear here once you import a portfolio CSV."
          action={{ label: "Import CSV", href: "/import" }}
        />
      </>
    );
  }

  const withoutTicker = list.rows.filter((row) => row.ticker === null).length;

  return (
    <>
      <PageHeader
        title="Securities"
        description={`Holdings in ${activeProfile.name}'s snapshot from ${formatSnapshotDate(list.snapshotDate)}.`}
      />

      {withoutTicker > 0 ? (
        <Alert className="border-warning/50 mb-4">
          <AlertTriangle className="text-warning" />
          <AlertTitle>
            {withoutTicker} {withoutTicker === 1 ? "security needs" : "securities need"} a ticker
          </AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>Tickers enable Tickertape links. You only add each one once.</span>
            <Button asChild size="sm" variant="outline">
              <Link href="/securities/mapping">Add tickers</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <SecurityTable rows={list.rows} tags={tags} />
    </>
  );
}
