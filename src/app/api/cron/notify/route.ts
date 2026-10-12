import { timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import {
  actionSignalsNotification,
  type PlannedNotification,
  unsent,
  uploadReminderNotification,
} from "@/lib/notifications/digest";
import { isPushEnabled, sendToUser } from "@/lib/notifications/push";
import { getUploadReminder } from "@/lib/portfolio/reminders/queries";
import { todayInTimeZone } from "@/lib/portfolio/reminders/upload-reminder";
import { listProfileSignals } from "@/lib/portfolio/signals/queries";

const DAY_MS = 24 * 60 * 60 * 1000;

function authorized(request: Request): boolean {
  const expected = env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";

  if (!expected || given.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/**
 * Daily job: the month-end upload reminder and holdings needing a decision,
 * pushed to every device of users who turned notifications on.
 * Call with `Authorization: Bearer $CRON_SECRET`; see README "Notifications".
 */
async function run(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPushEnabled()) {
    return Response.json({ error: "Push is not configured (VAPID keys missing)." }, { status: 503 });
  }

  const now = new Date();
  const today = todayInTimeZone(now);
  const users = await prisma.user.findMany({
    where: { pushSubscriptions: { some: {} } },
    select: { id: true, profiles: { select: { id: true, name: true }, orderBy: { createdAt: "asc" } } },
  });

  let sent = 0;
  let skipped = 0;

  for (const user of users) {
    const forName = user.profiles.length > 1;
    const planned: PlannedNotification[] = [];

    for (const profile of user.profiles) {
      const [reminder, { entries }] = await Promise.all([getUploadReminder(profile.id, now), listProfileSignals(profile.id)]);

      if (reminder) planned.push(uploadReminderNotification(profile, reminder, today, forName));
      const signals = actionSignalsNotification(profile, entries, today, forName);
      if (signals) planned.push(signals);
    }

    const logged = await prisma.notificationLog.findMany({
      where: { userId: user.id, sentAt: { gte: new Date(now.getTime() - 2 * DAY_MS) } },
      select: { key: true },
    });
    const due = unsent(planned, new Set(logged.map((entry) => entry.key)));
    skipped += planned.length - due.length;

    for (const notification of due) {
      if ((await sendToUser(user.id, notification.payload)) > 0) {
        await prisma.notificationLog.create({ data: { userId: user.id, key: notification.key } }).catch(() => {});
        sent += 1;
      }
    }
  }

  // Keep the log small; only the last couple of days are ever checked.
  await prisma.notificationLog.deleteMany({ where: { sentAt: { lt: new Date(now.getTime() - 30 * DAY_MS) } } });

  return Response.json({ today, users: users.length, sent, skipped });
}

export const GET = run;
export const POST = run;
