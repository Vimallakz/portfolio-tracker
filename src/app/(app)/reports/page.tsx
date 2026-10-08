import { Upload } from "lucide-react";

import { ExportPdfButton } from "@/components/reports/export-pdf-button";
import { ReportControls } from "@/components/reports/report-controls";
import { ReportDocument } from "@/components/reports/report-document";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { buildHistory } from "@/lib/portfolio/analytics/dashboard";
import { monthOf } from "@/lib/portfolio/planner/contributions";
import { listMonths, listQuarters, parseReportPeriod } from "@/lib/portfolio/reports/period";
import { buildReport } from "@/lib/portfolio/reports/report";
import { todayInTimeZone } from "@/lib/portfolio/reminders/upload-reminder";
import { listProfileSnapshots } from "@/lib/portfolio/snapshots/queries";
import { getProfileContext } from "@/lib/profiles/profile-context";

export const metadata = { title: "Reports | Portfolio Intelligence" };

const DESCRIPTION = "A summary of any month, quarter or range, ready to save as PDF.";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [params, { activeProfile }] = await Promise.all([searchParams, getProfileContext()]);

  if (!activeProfile) {
    return (
      <>
        <PageHeader title="Reports" description={DESCRIPTION} />
        <EmptyState
          title="No profile yet"
          description="Create a profile to start tracking a portfolio."
          action={{ label: "Create profile", href: "/settings/profile" }}
        />
      </>
    );
  }

  const history = buildHistory(await listProfileSnapshots(activeProfile.id));
  const first = history[0];
  const latest = history.at(-1);

  if (!first || !latest) {
    return (
      <>
        <PageHeader title="Reports" description={DESCRIPTION} />
        <EmptyState
          icon={Upload}
          title="No snapshots yet"
          description="Import a Tickertape CSV each month and reports fill in for any month, quarter or range."
          action={{ label: "Import CSV", href: "/import" }}
        />
      </>
    );
  }

  const span = { first: monthOf(first.snapshotDate), latest: monthOf(latest.snapshotDate) };
  const period = parseReportPeriod(params, span);
  const report = buildReport(history, period);

  return (
    <>
      <div className="print:hidden">
        <PageHeader title="Reports" description={DESCRIPTION} actions={report ? <ExportPdfButton /> : undefined} />
      </div>

      <div className="grid gap-6 print:block">
        <ReportControls period={period} months={listMonths(span)} quarters={listQuarters(span)} />

        {report ? (
          <ReportDocument report={report} profileName={activeProfile.name} generatedOn={todayInTimeZone(new Date())} />
        ) : (
          <EmptyState
            title={`No snapshot in ${period.label}`}
            description="Pick another period, or import a CSV dated in this one."
            action={{ label: "Import CSV", href: "/import" }}
          />
        )}
      </div>
    </>
  );
}
