import { GitCompareArrows } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "Compare | Portfolio Intelligence" };

export default function ComparePage() {
  return (
    <>
      <PageHeader
        title="Compare snapshots"
        description="Pick two snapshots to see what changed between them."
      />
      <EmptyState
        icon={GitCompareArrows}
        title="Not enough snapshots"
        description="Comparison needs at least two snapshots. Import a CSV in two different months to compare them."
        action={{ label: "Import CSV", href: "/import" }}
      />
    </>
  );
}
