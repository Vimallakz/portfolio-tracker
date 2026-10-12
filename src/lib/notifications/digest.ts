import type { UploadReminderWindow } from "@/lib/portfolio/reminders/upload-reminder";
import type { SecuritySignals, SignalKind } from "@/lib/portfolio/signals/signals";

/** What the service worker shows; see the push handler in public/sw.js. */
export type PushPayload = {
  title: string;
  body: string;
  /** Opened when the notification is tapped. */
  url: string;
  /** A newer notification with the same tag replaces the older one on the device. */
  tag: string;
};

export type PlannedNotification = {
  /** Unique per user and day, so the daily job never sends the same thing twice. */
  key: string;
  payload: PushPayload;
};

type ProfileRef = { id: string; name: string };

/** Signals worth interrupting someone for: a decision is due now. */
export const NOTIFY_SIGNAL_KINDS: SignalKind[] = ["stop-hit", "above-my-target"];

const MAX_LISTED = 3;

const monthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });

/** `forName` adds the profile name when the user has more than one. */
export function uploadReminderNotification(
  profile: ProfileRef,
  window: UploadReminderWindow,
  today: string,
  forName: boolean,
): PlannedNotification {
  const month = monthLabel(window.month);
  const whose = forName ? `${profile.name}'s ` : "your ";

  return {
    key: `upload:${today}:${profile.id}`,
    payload: {
      title: window.isOverdue ? `${month} snapshot is overdue` : `Time for ${month}'s snapshot`,
      body: `Import ${whose}month-end CSV so the dashboard, planner and signals stay current.`,
      url: `/import?date=${window.suggestedDate}`,
      tag: `upload-${profile.id}`,
    },
  };
}

/** One notification listing the holdings that need a decision, or null when none do. */
export function actionSignalsNotification(
  profile: ProfileRef,
  entries: SecuritySignals[],
  today: string,
  forName: boolean,
): PlannedNotification | null {
  const due = entries.flatMap((entry) =>
    entry.signals
      .filter((signal) => NOTIFY_SIGNAL_KINDS.includes(signal.kind))
      .map((signal) => ({ label: entry.ticker ?? entry.name, kind: signal.kind, title: signal.title })),
  );

  if (due.length === 0) {
    return null;
  }

  // Stops first: they are the more urgent of the two.
  due.sort((a, b) => NOTIFY_SIGNAL_KINDS.indexOf(a.kind) - NOTIFY_SIGNAL_KINDS.indexOf(b.kind));
  const prefix = forName ? `${profile.name}: ` : "";
  const listed = due.slice(0, MAX_LISTED).map((item) => `${item.label} ${item.title.toLowerCase()}`);
  const more = due.length > MAX_LISTED ? ` and ${due.length - MAX_LISTED} more` : "";

  return {
    key: `signals:${today}:${profile.id}`,
    payload: {
      title: due.length === 1 ? `${prefix}${due[0].label} needs a decision` : `${prefix}${due.length} holdings need a decision`,
      body: `${listed.join(" · ")}${more}.`,
      url: "/focus",
      tag: `signals-${profile.id}`,
    },
  };
}

/** Drops what was already sent; `sentKeys` comes from the notification log. */
export const unsent = (planned: PlannedNotification[], sentKeys: ReadonlySet<string>) =>
  planned.filter((notification) => !sentKeys.has(notification.key));
