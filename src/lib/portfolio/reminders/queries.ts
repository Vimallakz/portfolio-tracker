import { prisma } from "@/lib/db/prisma";
import {
  getUploadReminderWindow,
  todayInTimeZone,
  type UploadReminderWindow,
} from "@/lib/portfolio/reminders/upload-reminder";

const toDateOnly = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`);

/**
 * The month-end CSV reminder for a profile, or null when outside the window or
 * the month already has a snapshot dated from the 28th onward.
 */
export async function getUploadReminder(profileId: string, now: Date = new Date()): Promise<UploadReminderWindow | null> {
  const window = getUploadReminderWindow(todayInTimeZone(now));

  if (!window) {
    return null;
  }

  const covered = await prisma.portfolioSnapshot.findFirst({
    where: {
      profileId,
      snapshotDate: { gte: toDateOnly(window.coveredFrom), lte: toDateOnly(window.coveredTo) },
    },
    select: { id: true },
  });

  return covered ? null : window;
}
