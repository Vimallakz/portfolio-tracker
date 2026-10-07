import { BellRing } from "lucide-react";
import Link from "next/link";

import type { UploadReminderWindow } from "@/lib/portfolio/reminders/upload-reminder";
import { cn } from "@/lib/utils";

const monthName = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" });

export function UploadReminder({ reminder }: { reminder: UploadReminderWindow }) {
  const month = monthName.format(new Date(`${reminder.month}-01T00:00:00Z`));
  const label = `Upload ${month} CSV`;

  return (
    <Link
      href={`/import?date=${reminder.suggestedDate}`}
      title={
        reminder.isOverdue
          ? `${month} has ended. Upload its month-end CSV so this month can be compared with earlier months.`
          : `Month-end: upload this month's CSV so ${month} can be compared with earlier months.`
      }
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
        "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
        reminder.isOverdue
          ? "border-amber-500/50 bg-amber-500/15 text-amber-800 hover:bg-amber-500/25 dark:text-amber-300"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400",
      )}
    >
      <BellRing className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{month.slice(0, 3)} CSV</span>
    </Link>
  );
}
