import { Upload } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { getProfileContext } from "@/lib/profiles/profile-context";

export const metadata = { title: "Dashboard | Portfolio Intelligence" };

export default async function DashboardPage() {
  const { activeProfile } = await getProfileContext();

  if (!activeProfile) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <EmptyState
          title="No profile yet"
          description="Create a profile to start tracking a portfolio. Each profile keeps its own holdings, snapshots and research."
          action={{ label: "Create profile", href: "/settings/profile" }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`${activeProfile.name} Portfolio`}
        description="Portfolio summary, allocation and performance."
      />
      <EmptyState
        icon={Upload}
        title="No portfolio yet"
        description="Upload your first Tickertape CSV to start tracking your portfolio."
        action={{ label: "Upload CSV", href: "/import" }}
      />
    </>
  );
}
