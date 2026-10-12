"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { LocalDateTime } from "@/components/shared/local-date-time";
import { Button } from "@/components/ui/button";
import { revokeExtensionDevice } from "@/lib/extension/actions";

export type ExtensionDevice = { id: string; name: string; createdAt: string; lastUsedAt: string | null; expiresAt: string };

function DeviceRow({ device }: { device: ExtensionDevice }) {
  const [isPending, startTransition] = useTransition();

  function revoke() {
    if (!window.confirm(`Sign out “${device.name}”? The extension there will ask to sign in again.`)) {
      return;
    }

    startTransition(async () => {
      const result = await revokeExtensionDevice(device.id);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Device signed out");
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{device.name}</p>
        <p className="text-muted-foreground text-xs">
          Signed in <LocalDateTime iso={device.createdAt} />
          {" · "}
          {device.lastUsedAt ? (
            <>
              Last used <LocalDateTime iso={device.lastUsedAt} />
            </>
          ) : (
            "Not used yet"
          )}
          {" · "}
          Expires <LocalDateTime iso={device.expiresAt} />
        </p>
      </div>
      <Button size="icon-sm" variant="ghost" onClick={revoke} disabled={isPending} aria-label={`Sign out ${device.name}`}>
        <Trash2 />
      </Button>
    </li>
  );
}

export function ExtensionDevices({ devices }: { devices: ExtensionDevice[] }) {
  if (devices.length === 0) {
    return <p className="text-muted-foreground text-sm">No devices yet. Sign in from the extension popup to connect one.</p>;
  }

  return (
    <ul className="divide-y">
      {devices.map((device) => (
        <DeviceRow key={device.id} device={device} />
      ))}
    </ul>
  );
}
