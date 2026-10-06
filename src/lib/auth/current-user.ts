import { prisma } from "@/lib/db/prisma";

/**
 * Version 1 has no login. Every request resolves to the single local account
 * created by the seed, and all ownership checks run against its id.
 *
 * This is the seam where real authentication plugs in: replace the body with a
 * session lookup and every caller keeps working, because they already treat the
 * returned id as the ownership root rather than assuming a single user.
 */
const LOCAL_USER_EMAIL = "local@portfolio.local";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser> {
  const user = await prisma.user.findUnique({
    where: { email: LOCAL_USER_EMAIL },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    throw new Error(
      "No local user found. Run `npm run db:seed` to create the local account.",
    );
  }

  return user;
}
