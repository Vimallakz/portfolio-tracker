"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { sendTestNotification, subscribePush, unsubscribePush } from "@/lib/notifications/actions";

type Support = "server" | "supported" | "install-first" | "unsupported";

const subscribeNone = () => () => {};

function detectSupport(): Support {
  if ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window) return "supported";
  // iOS only exposes push to apps added to the home screen (iOS 16.4+).
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios ? "install-first" : "unsupported";
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function NotificationsCard({ publicKey }: { publicKey: string | null }) {
  const support = useSyncExternalStore<Support>(subscribeNone, detectSupport, () => "server");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [checked, setChecked] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (support !== "supported") return;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((existing) => {
        setSubscription(existing);
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, [support]);

  const turnOn = () =>
    startTransition(async () => {
      if (!publicKey) return;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notifications are blocked. Allow them for this site in your browser or phone settings.");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.ready;
        const created = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        const result = await subscribePush(created.toJSON());
        if (!result.ok) {
          await created.unsubscribe();
          toast.error(result.error);
          return;
        }
        setSubscription(created);
        toast.success("Notifications are on for this device");
      } catch (error) {
        toast.error(
          error instanceof DOMException && error.name === "AbortError"
            ? "This browser has no push service. Try Chrome, Edge, Firefox or Safari."
            : "This browser could not turn on notifications.",
        );
      }
    });

  const turnOff = () =>
    startTransition(async () => {
      if (!subscription) return;
      await unsubscribePush(subscription.endpoint);
      await subscription.unsubscribe().catch(() => false);
      setSubscription(null);
      toast.success("Notifications are off for this device");
    });

  const sendTest = () =>
    startTransition(async () => {
      const result = await sendTestNotification();
      if (result.ok) toast.success("Test sent. It should appear in a few seconds.");
      else toast.error(result.error);
    });

  let body: React.ReactNode;

  if (!publicKey) {
    body = <p className="text-muted-foreground text-sm">Not set up on this server yet (VAPID keys are missing).</p>;
  } else if (support === "server" || (support === "supported" && !checked)) {
    body = <p className="text-muted-foreground text-sm">Checking this device…</p>;
  } else if (support === "install-first") {
    body = (
      <p className="text-muted-foreground text-sm">
        On iPhone and iPad, add the app to your Home Screen first (Share, then Add to Home Screen), open it from there,
        and turn notifications on in this card. Needs iOS 16.4 or later.
      </p>
    );
  } else if (support === "unsupported") {
    body = <p className="text-muted-foreground text-sm">This browser does not support notifications.</p>;
  } else if (subscription) {
    body = (
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-muted-foreground mr-auto text-sm">On for this device.</p>
        <Button size="sm" variant="outline" onClick={sendTest} disabled={pending}>
          Send a test
        </Button>
        <Button size="sm" variant="ghost" onClick={turnOff} disabled={pending}>
          <BellOff className="size-4" />
          Turn off
        </Button>
      </div>
    );
  } else {
    body = (
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-muted-foreground mr-auto text-sm">Off for this device.</p>
        <Button size="sm" onClick={turnOn} disabled={pending}>
          <Bell className="size-4" />
          Turn on
        </Button>
      </div>
    );
  }

  return (
    <Card className="gap-2 p-4">
      <div className="grid gap-0.5">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Bell className="text-muted-foreground size-4" />
          Notifications
        </p>
        <p className="text-muted-foreground text-sm">
          A reminder when the month-end CSV is due, and a heads-up when a holding hits your stop or target. At most once
          a day each.
        </p>
      </div>
      {body}
    </Card>
  );
}
