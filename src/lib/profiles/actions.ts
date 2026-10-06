"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions/result";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import {
  ACTIVE_PROFILE_COOKIE,
  activeProfileCookieOptions,
} from "@/lib/profiles/profile-context";
import { findOwnedProfile } from "@/lib/profiles/queries";
import { profileInputSchema } from "@/lib/profiles/schema";

export type { ActionResult };

const selectProfileSchema = z.object({ profileId: z.string().min(1) });

async function setActiveProfileCookie(profileId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_PROFILE_COOKIE, profileId, activeProfileCookieOptions);
}

/**
 * Persists the active profile choice. Ownership is checked before the cookie is
 * written, so a forged id is rejected rather than stored.
 */
export async function selectProfile(profileId: string): Promise<ActionResult> {
  const parsed = selectProfileSchema.safeParse({ profileId });

  if (!parsed.success) {
    return { ok: false, error: "Invalid profile." };
  }

  const user = await getCurrentUser();
  const profile = await findOwnedProfile(user.id, parsed.data.profileId);

  if (!profile) {
    return { ok: false, error: "Profile not found." };
  }

  await setActiveProfileCookie(profile.id);
  revalidatePath("/", "layout");

  return { ok: true };
}

export async function createProfile(input: unknown): Promise<ActionResult> {
  const parsed = profileInputSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: z.prettifyError(parsed.error) };
  }

  const user = await getCurrentUser();

  const existing = await prisma.profile.findUnique({
    where: { userId_name: { userId: user.id, name: parsed.data.name } },
    select: { id: true },
  });

  if (existing) {
    return { ok: false, error: "A profile with that name already exists." };
  }

  const profile = await prisma.profile.create({
    data: { ...parsed.data, userId: user.id },
    select: { id: true },
  });

  // Switch to the profile the user just created; it is almost certainly the
  // one they want to work in.
  await setActiveProfileCookie(profile.id);
  revalidatePath("/", "layout");

  return { ok: true };
}

export async function updateProfile(
  profileId: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = profileInputSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: z.prettifyError(parsed.error) };
  }

  const user = await getCurrentUser();
  const owned = await findOwnedProfile(user.id, profileId);

  if (!owned) {
    return { ok: false, error: "Profile not found." };
  }

  const nameClash = await prisma.profile.findFirst({
    where: {
      userId: user.id,
      name: parsed.data.name,
      id: { not: owned.id },
    },
    select: { id: true },
  });

  if (nameClash) {
    return { ok: false, error: "A profile with that name already exists." };
  }

  await prisma.profile.update({
    where: { id: owned.id },
    data: parsed.data,
  });

  revalidatePath("/", "layout");

  return { ok: true };
}
