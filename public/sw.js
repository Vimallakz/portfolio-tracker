/*
 * Service worker: offline viewing of pages already opened, and push notifications.
 * Plain JS, served as-is from /sw.js. Bump VERSION when the precache list changes.
 */
const VERSION = "v2";
const STATIC_CACHE = `static-${VERSION}`;
// Shared with src/lib/pwa/page-cache.ts, which clears it on logout and profile switch.
const PAGE_CACHE = "pages";
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/badge-96.png"];
// Registered as /sw.js?dev=1 by `next dev`: push only, no caching to fight hot reload.
const CACHING = !new URL(self.location.href).searchParams.has("dev");
const NEVER_CACHE = ["/api/", "/login", "/signup"];

/** The offline page needs its own JS and CSS to list saved pages, so cache what its HTML references. */
async function precache() {
  const cache = await caches.open(STATIC_CACHE);
  await cache.addAll(PRECACHE);
  const offline = await cache.match(OFFLINE_URL);
  const html = offline ? await offline.text() : "";
  const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? [])];
  await Promise.all(assets.map((asset) => cache.add(asset).catch(() => undefined)));
}

self.addEventListener("install", (event) => {
  event.waitUntil((CACHING ? precache() : Promise.resolve()).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith("static-") && key !== STATIC_CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const isStaticAsset = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/icons/") ||
  /\.(?:woff2?|png|svg|ico)$/.test(url.pathname);

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

/** Fresh page when online, and keep a copy; the last copy (or the offline page) when not. */
async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    if (response.ok && !response.redirected && response.type === "basic") {
      const cache = await caches.open(PAGE_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request, { cacheName: PAGE_CACHE });
    return cached ?? (await caches.match(OFFLINE_URL)) ?? Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (!CACHING || request.method !== "GET" || url.origin !== self.location.origin) return;
  if (NEVER_CACHE.some((prefix) => url.pathname.startsWith(prefix))) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
  } else if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Portfolio Intelligence";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag,
      data: { url: data.url || "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url.startsWith(self.location.origin));
      if (open) {
        return open.focus().then((client) => client.navigate(target));
      }
      return self.clients.openWindow(target);
    }),
  );
});
