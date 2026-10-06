"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions/result";
import { prisma } from "@/lib/db/prisma";
import { findProfileSecurity } from "@/lib/portfolio/securities/queries";
import { requireActiveProfile } from "@/lib/profiles/profile-context";
import { researchInputSchema } from "@/lib/research/schema";

const securityIdSchema = z.string().min(1).max(64);

/** Creates or replaces the active profile's research on one security. */
export async function updateSecurityResearch(securityId: string, input: unknown): Promise<ActionResult> {
  const id = securityIdSchema.safeParse(securityId);
  const parsed = researchInputSchema.safeParse(input);

  if (!id.success || !parsed.success) {
    return { ok: false, error: parsed.success ? "Invalid security." : z.prettifyError(parsed.error) };
  }

  const { profile } = await requireActiveProfile();
  const security = await findProfileSecurity(profile.id, id.data);

  if (!security) {
    return { ok: false, error: "Security not found." };
  }

  await prisma.securityResearch.upsert({
    where: { profileId_securityId: { profileId: profile.id, securityId: security.id } },
    create: { ...parsed.data, profileId: profile.id, securityId: security.id },
    update: parsed.data,
  });

  revalidatePath("/", "layout");

  return { ok: true };
}
