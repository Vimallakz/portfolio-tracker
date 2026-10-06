import { Upload } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "Securities | Portfolio Intelligence" };

export default function SecuritiesPage() {
  return (
    <>
      <PageHeader
        title="Securities"
        description="Every stock and ETF held in this profile, with position and research status."
      />
      <EmptyState
        icon={Upload}
        title="No securities yet"
        description="Securities appear here once you import a portfolio CSV."
        action={{ label: "Import CSV", href: "/import" }}
      />
    </>
  );
}
