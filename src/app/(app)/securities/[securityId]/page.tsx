import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PortfolioValueChart } from "@/components/dashboard/portfolio-value-chart";
import { ResearchSummary } from "@/components/research/research-summary";
import { SecurityDetailsCard } from "@/components/securities/security-details-card";
import { SecurityHeader } from "@/components/securities/security-header";
import { SecurityHistoryTable } from "@/components/securities/security-history-table";
import { MarketCardSkeleton, NewsSection, PriceTargetsSection } from "@/components/securities/security-market-sections";
import { SecurityPositionCard } from "@/components/securities/security-position-card";
import { SecurityTagsEditor } from "@/components/securities/security-tags-editor";
import { getSecurityDetail } from "@/lib/portfolio/securities/queries";
import { getProfileContext } from "@/lib/profiles/profile-context";

export const metadata = { title: "Security | Portfolio Intelligence" };

export default async function SecurityPage({ params }: { params: Promise<{ securityId: string }> }) {
  const [{ securityId }, { activeProfile }] = await Promise.all([params, getProfileContext()]);
  const detail = activeProfile ? await getSecurityDetail(activeProfile.id, securityId) : null;

  if (!detail || !activeProfile) {
    notFound();
  }

  const profileId = activeProfile.id;
  const { security, history, position, research, tags, availableTags } = detail;

  return (
    <>
      <SecurityHeader security={security} tags={tags} hasResearch={research !== null} />
      <div className="grid gap-4">
        <SecurityPositionCard position={position} latestSnapshotDate={detail.latestSnapshotDate} lastHeld={history.at(-1)} />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="grid content-start gap-4 lg:col-span-2">
            {history.length > 0 ? (
              <PortfolioValueChart
                history={history}
                title="Performance history"
                description="This holding's value and invested amount at each snapshot. A jump in invested means you bought more."
              />
            ) : null}
            <Suspense fallback={<MarketCardSkeleton rows={4} />}>
              <PriceTargetsSection profileId={profileId} security={security} />
            </Suspense>
            <ResearchSummary securityId={security.id} research={research} />
            {history.length > 0 ? <SecurityHistoryTable history={history} /> : null}
          </div>
          <div className="grid content-start gap-4">
            <SecurityDetailsCard key={security.ticker ?? "unmapped"} security={security} />
            <SecurityTagsEditor securityId={security.id} assigned={tags} available={availableTags} />
            <Suspense fallback={<MarketCardSkeleton />}>
              <NewsSection ticker={security.ticker} />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
