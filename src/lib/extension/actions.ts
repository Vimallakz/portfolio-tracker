"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions/result";
import { revokeApiToken } from "@/lib/auth/api-token";
import { getCurrentUser } from "@/lib/auth/current-user";

const idSchema = z.string().min(1).max(64);

export async function revokeExtensionDevice(tokenId: string): Promise<ActionResult> {
  const id = idSchema.safeParse(tokenId);

  if (!id.success) {
    return { ok: false, error: "Invalid device." };
  }

  const user = await getCurrentUser();

  if (!(await revokeApiToken(user.id, id.data))) {
    return { ok: false, error: "Device not found. It may already be signed out." };
  }

  revalidatePath("/settings/extension");

  return { ok: true };
}
