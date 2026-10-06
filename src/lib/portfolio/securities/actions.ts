"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/actions/result";
import { prisma } from "@/lib/db/prisma";
import { findProfileSecurity } from "@/lib/portfolio/securities/queries";
import { securityDetailsInputSchema } from "@/lib/portfolio/securities/schema";
import { requireActiveProfile } from "@/lib/profiles/profile-context";

const securityIdSchema = z.string().min(1).max(64);

/**
 * Saves a security's ticker, type and descriptive facts. The ticker is kept on
 * the shared Security row, so the mapping is remembered for every future
 * import of the same CSV name.
 */
export async function updateSecurityDetails(securityId: string, input: unknown): Promise<ActionResult> {
  const id = securityIdSchema.safeParse(securityId);
  const parsed = securityDetailsInputSchema.safeParse(input);

  if (!id.success || !parsed.success) {
    return { ok: false, error: parsed.success ? "Invalid security." : z.prettifyError(parsed.error) };
  }

  const { profile } = await requireActiveProfile();
  const security = await findProfileSecurity(profile.id, id.data);

  if (!security) {
    return { ok: false, error: "Security not found." };
  }

  const { ticker } = parsed.data;

  if (ticker) {
    const clash = await prisma.security.findFirst({
      where: { country: security.country, ticker, id: { not: security.id } },
      select: { name: true },
    });

    if (clash) {
      return { ok: false, error: `${ticker} is already assigned to “${clash.name}”.` };
    }
  }

  try {
    await prisma.security.update({ where: { id: security.id }, data: parsed.data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: `${ticker} is already assigned to another security.` };
    }

    throw error;
  }

  revalidatePath("/", "layout");

  return { ok: true };
}
