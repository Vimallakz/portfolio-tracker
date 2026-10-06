import { FileSpreadsheet } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "Import CSV | Portfolio Intelligence" };

export default function ImportPage() {
  return (
    <>
      <PageHeader
        title="Import portfolio"
        description="Upload a Tickertape CSV export. Nothing is saved until you confirm the preview."
      />
      <EmptyState
        icon={FileSpreadsheet}
        title="CSV import is not built yet"
        description="Upload, column mapping, security resolution and the import preview arrive in Phase 3."
      />
    </>
  );
}
