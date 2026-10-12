"use server";

import { z } from "zod";

import type { ActionResult } from "@/lib/actions/result";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { isPushEnabled, sendToUser } from "@/lib/notifications/push";

const subscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/** Saves this device's subscription; re-subscribing the same device moves it to the current user. */
export async function subscribePush(input: unknown): Promise<ActionResult> {
  if (!isPushEnabled()) {
    return { ok: false, error: "Notifications are not set up on this server." };
  }

  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "This browser sent an invalid subscription." };
  }

  const user = await getCurrentUser();
  const { endpoint, keys } = parsed.data;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
  });

  return { ok: true };
}

export async function unsubscribePush(endpoint: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  await prisma.pushSubscription.deleteMany({ where: { userId: user.id, endpoint } });
  return { ok: true };
}

export async function sendTestNotification(): Promise<ActionResult> {
  const user = await getCurrentUser();
  const delivered = await sendToUser(user.id, {
    title: "Notifications are on",
    body: "You will hear about month-end uploads and holdings that need a decision.",
    url: "/settings",
    tag: "test",
  });

  return delivered > 0 ? { ok: true } : { ok: false, error: "No device received it. Try turning notifications off and on." };
}
