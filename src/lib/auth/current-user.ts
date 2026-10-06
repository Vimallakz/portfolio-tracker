import { prisma } from "@/lib/db/prisma";

/**
 * Version 1 has no login. Every request resolves to the single local account,
 * which is created on first use so an empty database works without seeding.
 * All ownership checks run against its id.
 *
 * This is the seam where real authentication plugs in: replace the body with a
 * session lookup and every caller keeps working, because they already treat the
 * returned id as the ownership root rather than assuming a single user.
 */
const LOCAL_USER_EMAIL = "local@portfolio.local";

const currentUserSelect = { id: true, email: true, name: true } as const;

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser> {
  const existing = await prisma.user.findUnique({
    where: { email: LOCAL_USER_EMAIL },
    select: currentUserSelect,
  });

  if (existing) {
    return existing;
  }

  // Prisma's upsert is not atomic, so parallel first requests can both try to
  // insert. skipDuplicates compiles to ON CONFLICT DO NOTHING, which cannot.
  await prisma.user.createMany({
    data: [{ email: LOCAL_USER_EMAIL, name: "Local User" }],
    skipDuplicates: true,
  });

  return prisma.user.findUniqueOrThrow({
    where: { email: LOCAL_USER_EMAIL },
    select: currentUserSelect,
  });
}
