import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TagManager } from "@/components/tags/tag-manager";
import { getProfileContext } from "@/lib/profiles/profile-context";
import { listTagsWithUsage } from "@/lib/tags/queries";

export const metadata = { title: "Tags | Portfolio Intelligence" };

export default async function TagsPage() {
  const { activeProfile } = await getProfileContext();

  if (!activeProfile) {
    return (
      <>
        <PageHeader title="Tags" />
        <EmptyState
          title="No profile yet"
          description="Tags belong to a profile. Create one first."
          action={{ label: "Create profile", href: "/settings/profile" }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Tags" description={`${activeProfile.name}'s labels for grouping securities. Other profiles have their own.`} />
      <TagManager tags={await listTagsWithUsage(activeProfile.id)} />
    </>
  );
}
