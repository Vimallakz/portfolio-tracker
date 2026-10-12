"use client";

import { useEffect } from "react";

/** Dev registers with ?dev=1, which keeps push but turns caching off so hot reload is unaffected. */
const SW_URL = process.env.NODE_ENV === "production" ? "/sw.js" : "/sw.js?dev=1";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register(SW_URL, { scope: "/", updateViaCache: "none" }).catch(() => {
      // Without a service worker the app still works, just not offline.
    });
  }, []);

  return null;
}
