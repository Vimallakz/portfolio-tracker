import { Tags } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "Tags | Portfolio Intelligence" };

export default function TagsPage() {
  return (
    <>
      <PageHeader
        title="Tags"
        description="Tags are scoped to the active profile and used to classify securities."
      />
      <EmptyState
        icon={Tags}
        title="Tags are not available yet"
        description="The tag model arrives with the rest of the domain schema in Phase 2."
      />
    </>
  );
}
