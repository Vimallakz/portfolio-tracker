import { ProfileSettings } from "@/components/profiles/profile-settings";
import { PageHeader } from "@/components/shared/page-header";
import { prisma } from "@/lib/db/prisma";
import { getProfileContext } from "@/lib/profiles/profile-context";

export const metadata = { title: "Investment profiles | Portfolio Intelligence" };

export default async function ProfileSettingsPage() {
  const { userId, activeProfile } = await getProfileContext();

  const profiles = await prisma.profile.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      notes: true,
      panNumber: true,
    },
  });

  return (
    <>
      <PageHeader
        title="Investment profiles"
        description="Each profile keeps its own holdings, snapshots and research, for example yours and a family member's."
      />
      <ProfileSettings
        profiles={profiles.map((profile) => ({
          ...profile,
          isActive: profile.id === activeProfile?.id,
        }))}
      />
    </>
  );
}
