import { Upload } from "lucide-react";

import { ExportPdfButton } from "@/components/reports/export-pdf-button";
import { ReportControls } from "@/components/reports/report-controls";
import { ReportDocument } from "@/components/reports/report-document";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { buildHistory } from "@/lib/portfolio/analytics/dashboard";
import { calculateMoneyWeightedReturn } from "@/lib/portfolio/analytics/xirr";
import { addMonths } from "@/lib/portfolio/analytics/monthly-performance";
import { compareMonths, comparePeriod } from "@/lib/portfolio/benchmark/benchmark";
import { getBenchmarkPrices } from "@/lib/portfolio/benchmark/prices";
import { monthOf } from "@/lib/portfolio/planner/contributions";
import { listMonths, listQuarters, parseReportPeriod } from "@/lib/portfolio/reports/period";
import { buildReport, type PortfolioReport } from "@/lib/portfolio/reports/report";
import { todayInTimeZone } from "@/lib/portfolio/reminders/upload-reminder";
import { listProfileSnapshots } from "@/lib/portfolio/snapshots/queries";
import { getProfileContext } from "@/lib/profiles/profile-context";

export const metadata = { title: "Reports | Portfolio Intelligence" };

const DESCRIPTION = "A summary of any month, quarter or range, ready to save as PDF.";

/**
 * The period against each index from the last close of the starting
 * snapshot's month to the last close of the period's final month. A period
 * holding the first snapshot counts as invested at the start of its month.
 */
async function compareReportWithMarket(report: PortfolioReport) {
  const firstDate = report.startDate ?? report.valueSeries[0].snapshotDate;
  const prices = await getBenchmarkPrices(firstDate);

  return {
    period: comparePeriod(
      {
        fromMonth: report.startDate ? monthOf(report.startDate) : addMonths(monthOf(firstDate), -1),
        toMonth: report.period.end,
        yourReturn: report.periodReturn,
        yourGain: report.marketGain,
        base: report.moneyAtWork,
      },
      prices,
    ),
    months: compareMonths(report.monthly, prices),
  };
}

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
  const market = report ? await compareReportWithMarket(report) : null;

  return (
    <>
      <div className="print:hidden">
        <PageHeader title="Reports" description={DESCRIPTION} actions={report ? <ExportPdfButton /> : undefined} />
      </div>

      <div className="grid gap-6 print:block">
        <ReportControls period={period} months={listMonths(span)} quarters={listQuarters(span)} />

        {report ? (
          <ReportDocument
            report={report}
            market={market}
            yearly={calculateMoneyWeightedReturn(history.filter((point) => point.snapshotDate <= report.endDate))}
            profileName={activeProfile.name}
            generatedOn={todayInTimeZone(new Date())}
          />
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
