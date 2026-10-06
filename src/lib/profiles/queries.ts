import { prisma } from "@/lib/db/prisma";

/**
 * Profile shape for navigation and selectors. panNumber is deliberately absent:
 * only the settings page asks for it, through getProfileDetail().
 */
export type ProfileSummary = {
  id: string;
  name: string;
};

export type ProfileDetail = ProfileSummary & {
  email: string | null;
  phone: string | null;
  notes: string | null;
  panNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function listProfiles(userId: string): Promise<ProfileSummary[]> {
  return prisma.profile.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
}

/**
 * Resolves a profile only if it belongs to userId, so a tampered cookie or a
 * guessed id cannot reach another account's profile.
 */
export async function findOwnedProfile(
  userId: string,
  profileId: string,
): Promise<ProfileSummary | null> {
  return prisma.profile.findFirst({
    where: { id: profileId, userId },
    select: { id: true, name: true },
  });
}

export async function getProfileDetail(
  userId: string,
  profileId: string,
): Promise<ProfileDetail | null> {
  return prisma.profile.findFirst({
    where: { id: profileId, userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      notes: true,
      panNumber: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
