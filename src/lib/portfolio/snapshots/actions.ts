"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions/result";
import { prisma } from "@/lib/db/prisma";
import { requireActiveProfile } from "@/lib/profiles/profile-context";

const idSchema = z.string().min(1).max(64);

/**
 * Removes a snapshot and its holdings. Securities, research and tags are kept,
 * and re-importing the same CSV recreates the snapshot.
 */
export async function deleteSnapshot(snapshotId: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(snapshotId);

  if (!id.success) {
    return { ok: false, error: "Invalid snapshot." };
  }

  const { profile } = await requireActiveProfile();
  const { count } = await prisma.portfolioSnapshot.deleteMany({ where: { id: id.data, profileId: profile.id } });

  if (count === 0) {
    return { ok: false, error: "Snapshot not found. It may already have been deleted." };
  }

  revalidatePath("/", "layout");

  return { ok: true };
}
