"use client";

import { useSyncExternalStore } from "react";

const subscribeNone = () => () => {};

const localFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/**
 * A timestamp in the viewer's own time zone. The server does not know that
 * zone, so nothing renders until the browser takes over.
 */
export function LocalDateTime({ iso }: { iso: string }) {
  const formatted = useSyncExternalStore(
    subscribeNone,
    () => localFormat.format(new Date(iso)),
    () => null,
  );

  return formatted ? <time dateTime={iso}>{formatted}</time> : null;
}
