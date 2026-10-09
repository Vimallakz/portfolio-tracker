import { Crosshair, Upload } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { FocusSection } from "@/components/signals/focus-section";
import { NotAdviceNote } from "@/components/signals/signal-list";
import { Accordion } from "@/components/ui/accordion";
import { formatSnapshotDate } from "@/lib/format/date";
import { listProfileSignals } from "@/lib/portfolio/signals/queries";
import { signalsInGroup } from "@/lib/portfolio/signals/signals";
import { getProfileContext } from "@/lib/profiles/profile-context";

export const metadata = { title: "My Focus | Portfolio Intelligence" };

const DESCRIPTION = "Holdings worth a look now: dips, buy zones, targets reached, and research that needs a refresh.";

export default async function FocusPage() {
  const { activeProfile } = await getProfileContext();

  if (!activeProfile) {
    return (
      <>
        <PageHeader title="My Focus" description={DESCRIPTION} />
        <EmptyState
          title="No profile yet"
          description="Create a profile to start tracking a portfolio."
          action={{ label: "Create profile", href: "/settings/profile" }}
        />
      </>
    );
  }

  const { entries, latestSnapshotDate, liveQuotes } = await listProfileSignals(activeProfile.id);

  if (entries.length === 0) {
    return (
      <>
        <PageHeader title="My Focus" description={DESCRIPTION} />
        <EmptyState
          icon={latestSnapshotDate ? Crosshair : Upload}
          title={latestSnapshotDate ? "Nothing to focus on yet" : "No snapshots yet"}
          description={
            latestSnapshotDate
              ? "Add targets, a buy zone or a stop price in a security's research to get signals here."
              : "Import a Tickertape CSV to see signals for your holdings."
          }
          action={latestSnapshotDate ? { label: "Open securities", href: "/securities" } : { label: "Import CSV", href: "/import" }}
        />
      </>
    );
  }

  const sources = [
    liveQuotes ? "live Finnhub prices" : latestSnapshotDate ? `prices from your ${formatSnapshotDate(latestSnapshotDate)} snapshot` : null,
    "the targets in your research",
  ].filter(Boolean);

  const actions = signalsInGroup(entries, "action");
  const opportunities = signalsInGroup(entries, "opportunity");
  const reviews = signalsInGroup(entries, "review");
  // Open only the most urgent non-empty group; the rest stay collapsed so every header is visible.
  const firstOpen = actions.length > 0 ? "action" : opportunities.length > 0 ? "opportunity" : reviews.length > 0 ? "review" : null;

  return (
    <>
      <PageHeader title="My Focus" description={`${DESCRIPTION} Using ${sources.join(" and ")}.`} />
      <div className="grid gap-4">
        <Accordion type="multiple" defaultValue={firstOpen ? [firstOpen] : []} className="grid gap-3">
          <FocusSection
            title="Take action"
            description="A stop was hit, or the price reached your target or the analyst target. Decide what to do."
            group="action"
            entries={actions}
            emptyMessage="Nothing has reached a stop or a target."
          />
          <FocusSection
            title="Opportunities"
            description="Dips since the last snapshot, prices below your average cost or inside your buy zone, and strong analyst upside. Best first."
            group="opportunity"
            entries={opportunities}
            emptyMessage="No dips or buy-zone prices right now."
          />
          <FocusSection
            title="Review"
            description="Research that is out of date, missing targets, or far from the analyst view."
            group="review"
            entries={reviews}
            emptyMessage="Your research is up to date."
          />
        </Accordion>
        <NotAdviceNote />
      </div>
    </>
  );
}
