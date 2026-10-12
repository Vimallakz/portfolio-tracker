import { WifiOff } from "lucide-react";

import { SavedPages } from "@/components/pwa/saved-pages";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Offline | Portfolio Intelligence" };

/** Served by the service worker when a page that was never opened is requested offline. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <WifiOff className="text-muted-foreground size-5" />
      </div>
      <div className="grid gap-1.5">
        <h1 className="text-lg font-semibold">You&apos;re offline</h1>
        <p className="text-muted-foreground text-sm">
          This page hasn&apos;t been opened on this device yet. Pages you have opened before still work, with the
          figures from when you last saw them.
        </p>
      </div>
      <SavedPages />
      <Button asChild variant="outline" size="sm">
        {/* A full reload, so the service worker gets another try at the network. */}
        <a href="/dashboard">Try again</a>
      </Button>
    </main>
  );
}
