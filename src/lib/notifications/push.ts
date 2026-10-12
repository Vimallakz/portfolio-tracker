import webpush, { WebPushError } from "web-push";

import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import type { PushPayload } from "@/lib/notifications/digest";

export const isPushEnabled = () => Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

let configured = false;

function configure() {
  if (!configured) {
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
    configured = true;
  }
}

/**
 * Sends to every device the user enabled. Subscriptions the push service
 * reports as gone (404, 410) are deleted. Returns how many devices got it.
 */
export async function sendToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!isPushEnabled()) {
    return 0;
  }

  configure();
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  const body = JSON.stringify(payload);
  let delivered = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          body,
          { TTL: 24 * 60 * 60, urgency: "normal" },
        );
        delivered += 1;
        await prisma.pushSubscription.update({ where: { id: subscription.id }, data: { lastSentAt: new Date() } });
      } catch (error) {
        if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
          await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => {});
        } else {
          console.error("Push failed", subscription.endpoint.slice(0, 60), error);
        }
      }
    }),
  );

  return delivered;
}
