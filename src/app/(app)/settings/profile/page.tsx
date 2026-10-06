import { ProfileSettings } from "@/components/profiles/profile-settings";
import { PageHeader } from "@/components/shared/page-header";
import { prisma } from "@/lib/db/prisma";
import { getProfileContext } from "@/lib/profiles/profile-context";

export const metadata = { title: "Profile | Portfolio Intelligence" };

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
        title="Profiles"
        description="Investment profiles and their contact details."
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
