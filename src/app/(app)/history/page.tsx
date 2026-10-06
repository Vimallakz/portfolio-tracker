import { Upload } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "History | Portfolio Intelligence" };

export default function HistoryPage() {
  return (
    <>
      <PageHeader
        title="History"
        description="Every confirmed CSV import is kept as an immutable snapshot."
      />
      <EmptyState
        icon={Upload}
        title="No snapshots yet"
        description="Each confirmed import creates a snapshot. Import a CSV to record the first one."
        action={{ label: "Import CSV", href: "/import" }}
      />
    </>
  );
}
