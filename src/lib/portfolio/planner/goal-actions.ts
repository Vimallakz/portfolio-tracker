"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions/result";
import { prisma } from "@/lib/db/prisma";
import { goalInputSchema } from "@/lib/portfolio/planner/goal-schema";
import { requireActiveProfile } from "@/lib/profiles/profile-context";

function revalidateGoalPages() {
  revalidatePath("/planner");
  revalidatePath("/dashboard");
}

/** Creates or replaces the active profile's goal. */
export async function saveGoal(input: unknown): Promise<ActionResult> {
  const parsed = goalInputSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: z.prettifyError(parsed.error) };
  }

  const { profile } = await requireActiveProfile();
  const data = {
    name: parsed.data.name,
    targetAmount: parsed.data.targetAmount.toFixed(2),
    targetDate: new Date(`${parsed.data.targetMonth}-01T00:00:00.000Z`),
    inflationRate: parsed.data.inflationRate === null ? null : parsed.data.inflationRate.toFixed(2),
  };

  await prisma.investmentGoal.upsert({
    where: { profileId: profile.id },
    create: { ...data, profileId: profile.id },
    update: data,
  });

  revalidateGoalPages();
  return { ok: true };
}

export async function deleteGoal(): Promise<ActionResult> {
  const { profile } = await requireActiveProfile();
  await prisma.investmentGoal.deleteMany({ where: { profileId: profile.id } });

  revalidateGoalPages();
  return { ok: true };
}
