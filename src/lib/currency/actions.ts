"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions/result";
import { getCurrentUser } from "@/lib/auth/current-user";
import { DISPLAY_CURRENCIES, DISPLAY_CURRENCY_COOKIE } from "@/lib/currency/currency";
import { rateOverrideInputSchema } from "@/lib/currency/schema";
import { prisma } from "@/lib/db/prisma";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export async function setDisplayCurrency(currency: unknown): Promise<ActionResult> {
  const parsed = z.enum(DISPLAY_CURRENCIES).safeParse(currency);

  if (!parsed.success) {
    return { ok: false, error: "Unsupported currency." };
  }

  (await cookies()).set(DISPLAY_CURRENCY_COOKIE, parsed.data, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });

  return { ok: true };
}

export async function updateRateOverride(input: unknown): Promise<ActionResult> {
  const parsed = rateOverrideInputSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: z.prettifyError(parsed.error) };
  }

  const user = await getCurrentUser();

  await prisma.user.update({ where: { id: user.id }, data: { usdInrRateOverride: parsed.data.rate } });

  revalidatePath("/", "layout");

  return { ok: true };
}
