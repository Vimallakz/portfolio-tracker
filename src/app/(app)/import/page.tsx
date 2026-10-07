import { PortfolioImport } from "@/components/import/portfolio-import";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { getProfileContext } from "@/lib/profiles/profile-context";

export const metadata = { title: "Import CSV | Portfolio Intelligence" };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ date }, { activeProfile }] = await Promise.all([searchParams, getProfileContext()]);
  const defaultSnapshotDate = typeof date === "string" && ISO_DATE.test(date) ? date : undefined;

  if (!activeProfile) {
    return (
      <>
        <PageHeader title="Import portfolio" />
        <EmptyState
          title="No profile yet"
          description="Create a profile first. Each import is saved to the profile selected in the header."
          action={{ label: "Create profile", href: "/settings/profile" }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Import portfolio"
        description={`Upload a Tickertape CSV export for ${activeProfile.name}. Nothing is saved until you confirm the preview.`}
      />
      <PortfolioImport key={`${activeProfile.id}:${defaultSnapshotDate ?? ""}`} defaultSnapshotDate={defaultSnapshotDate} />
    </>
  );
}
