import { z } from "zod";

import { createApiToken } from "@/lib/auth/api-token";
import { INVALID_CREDENTIALS, verifyCredentials } from "@/lib/auth/credentials";
import { loginFormSchema } from "@/lib/auth/schema";
import { prisma } from "@/lib/db/prisma";
import type { ExtensionLoginResponse } from "@/lib/extension/contract";
import { errorJson, json } from "@/lib/extension/http";
import { createRateLimiter } from "@/lib/extension/rate-limit";
import { listProfiles } from "@/lib/profiles/queries";

const bodySchema = loginFormSchema.extend({
  deviceName: z.string().trim().max(60).optional(),
});

const allowAttempt = createRateLimiter({ limit: 10, windowMs: 15 * 60 * 1000 });

/** Exchanges email and password for a read-only extension token. */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return errorJson(z.prettifyError(parsed.error), 400);
  }

  const { email, password, deviceName } = parsed.data;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (!allowAttempt(`${ip}:${email}`)) {
    return errorJson("Too many sign-in attempts. Try again in 15 minutes.", 429);
  }

  const userId = await verifyCredentials(email, password);

  if (!userId) {
    return errorJson(INVALID_CREDENTIALS, 401);
  }

  const [{ token, expiresAt }, user, profiles] = await Promise.all([
    createApiToken(userId, deviceName || "Browser extension"),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, name: true } }),
    listProfiles(userId),
  ]);

  return json<ExtensionLoginResponse>({ token, expiresAt: expiresAt.toISOString(), user, profiles });
}
