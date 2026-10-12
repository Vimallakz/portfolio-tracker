"use client";

import { Download, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const DISMISSED_KEY = "install-hint-dismissed";

/** Chrome's install prompt event; not in the DOM typings. */
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

type Platform = "installed" | "ios" | "other" | "server";

const subscribeNone = () => () => {};

function detectPlatform(): Platform {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  if (standalone) return "installed";
  // iPadOS reports itself as a Mac, so also check for touch.
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios ? "ios" : "other";
}

export function InstallHint() {
  const platform = useSyncExternalStore<Platform>(subscribeNone, detectPlatform, () => "server");
  const storedDismissed = useSyncExternalStore(
    subscribeNone,
    () => localStorage.getItem(DISMISSED_KEY) === "1",
    () => true,
  );
  const [dismissed, setDismissed] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);

  if (platform === "server" || platform === "installed" || storedDismissed || dismissed) {
    return null;
  }

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") setInstallEvent(null);
  };

  return (
    <Card className="relative gap-2 p-4">
      <Button variant="ghost" size="icon" className="absolute top-2 right-2 size-8" onClick={dismiss} aria-label="Dismiss">
        <X className="size-4" />
      </Button>
      <p className="flex items-center gap-2 pr-8 text-sm font-medium">
        <Download className="text-muted-foreground size-4" />
        Install on your phone
      </p>
      {platform === "ios" ? (
        <p className="text-muted-foreground text-sm">
          In Safari, tap <Share className="inline size-4 align-text-bottom" aria-label="Share" /> Share, then{" "}
          <SquarePlus className="inline size-4 align-text-bottom" aria-label="Add" /> Add to Home Screen. It then opens
          full-screen like an app, and can send notifications.
        </p>
      ) : installEvent ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-muted-foreground text-sm">Open it from your home screen or dock like an app.</p>
          <Button size="sm" onClick={install}>
            Install app
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Use your browser&apos;s menu and choose Install app or Add to Home screen to open it like an app.
        </p>
      )}
    </Card>
  );
}
