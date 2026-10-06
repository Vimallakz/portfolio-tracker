import { redirect } from "next/navigation";

import { getSessionUser, type SessionUser } from "@/lib/auth/session";

export type CurrentUser = SessionUser;

/**
 * The signed-in user, or a redirect to /login. Every ownership check runs
 * against the returned id, so this is the single place requests are
 * authenticated: pages, layouts and server actions all call it.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
