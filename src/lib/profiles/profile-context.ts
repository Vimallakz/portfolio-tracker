import { cookies } from "next/headers";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  findOwnedProfile,
  listProfiles,
  type ProfileSummary,
} from "@/lib/profiles/queries";

export const ACTIVE_PROFILE_COOKIE = "pit_active_profile";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type ProfileContext = {
  userId: string;
  /** Null only when the account has no profiles yet. */
  activeProfile: ProfileSummary | null;
  profiles: ProfileSummary[];
};

/**
 * Resolves which profile the request is operating on. Every profile-scoped
 * query in later phases takes its profileId from here rather than from a
 * route param, so a URL alone can never widen the data scope.
 *
 * The cookie is only a hint. It is validated against the user's own profiles,
 * and falls back to the first profile when stale or forged.
 */
export async function getProfileContext(): Promise<ProfileContext> {
  // Read cookies before any query: it marks the route dynamic, so the build
  // bails out of prerendering instead of querying the database.
  const cookieStore = await cookies();
  const requestedId = cookieStore.get(ACTIVE_PROFILE_COOKIE)?.value;

  const user = await getCurrentUser();
  const profiles = await listProfiles(user.id);

  const activeProfile = requestedId
    ? await findOwnedProfile(user.id, requestedId)
    : null;

  return {
    userId: user.id,
    activeProfile: activeProfile ?? profiles[0] ?? null,
    profiles,
  };
}

/**
 * Narrower accessor for pages that cannot render without a profile. Throwing
 * here is intentional: it is a programming error to call this before the
 * caller has handled the no-profiles empty state.
 */
export async function requireActiveProfile(): Promise<{
  userId: string;
  profile: ProfileSummary;
}> {
  const { userId, activeProfile } = await getProfileContext();

  if (!activeProfile) {
    throw new Error("No active profile. Create a profile in Settings first.");
  }

  return { userId, profile: activeProfile };
}

export const activeProfileCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: COOKIE_MAX_AGE_SECONDS,
  secure: process.env.NODE_ENV === "production",
} as const;
