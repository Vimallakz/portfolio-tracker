import { Crosshair } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "My Focus | Portfolio Intelligence" };

export default function FocusPage() {
  return (
    <>
      <PageHeader
        title="My Focus"
        description="Holdings near your target, inside your accumulation zone, below your stop, or awaiting review."
      />
      <EmptyState
        icon={Crosshair}
        title="Nothing to focus on yet"
        description="This page is driven by the targets and conviction you record against each security. It fills in once research exists."
      />
    </>
  );
}
