"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions/result";
import { prisma } from "@/lib/db/prisma";
import { refreshAnalystData } from "@/lib/market-data/analyst-cache";
import { findProfileSecurity } from "@/lib/portfolio/securities/queries";
import { requireActiveProfile } from "@/lib/profiles/profile-context";

/** Re-fetches one security's analyst ratings, bypassing the weekly cache. */
export async function refreshSecurityAnalystData(securityId: string): Promise<ActionResult> {
  const id = z.string().min(1).max(64).safeParse(securityId);

  if (!id.success) {
    return { ok: false, error: "Invalid security." };
  }

  const { profile } = await requireActiveProfile();
  const visible = await findProfileSecurity(profile.id, id.data);

  if (!visible) {
    return { ok: false, error: "Security not found." };
  }

  const security = await prisma.security.findUniqueOrThrow({ where: { id: visible.id }, select: { id: true, ticker: true } });
  const result = await refreshAnalystData(security);

  if (result === "no-ticker") {
    return { ok: false, error: "Map a ticker to this security first." };
  }

  if (result === "unavailable") {
    return { ok: false, error: "Finnhub did not answer, or its rate limit was hit. Try again in a few minutes." };
  }

  revalidatePath(`/securities/${security.id}`);

  return { ok: true };
}
