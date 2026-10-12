"use client";

import { WifiOff } from "lucide-react";
import { useOffline } from "next/offline";
import { useEffect } from "react";

/**
 * Shown while the connection is down. In-app links then do full page loads,
 * which the service worker answers with the saved copy, instead of waiting
 * for the network the way client-side navigation does.
 */
export function OfflineBanner() {
  const offline = useOffline();

  useEffect(() => {
    if (!offline) return;

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const link = (event.target as Element | null)?.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target || link.origin !== window.location.origin) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      window.location.assign(link.href);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [offline]);

  if (!offline) {
    return null;
  }

  return (
    <div
      role="status"
      className="bg-warning/15 text-foreground flex items-center justify-center gap-2 border-b px-4 py-1.5 text-xs print:hidden"
    >
      <WifiOff className="size-3.5 shrink-0" aria-hidden="true" />
      Offline: showing figures saved when you last opened each page. Changes will send once you are back online.
    </div>
  );
}
