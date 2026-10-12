/** The service worker's cache of opened pages; the name must match PAGE_CACHE in public/sw.js. */
export const PAGE_CACHE = "pages";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/planner": "Planner",
  "/focus": "My Focus",
  "/history": "History",
  "/compare": "Compare",
  "/reports": "Reports",
  "/securities": "Securities",
};

/** Paths saved for offline use, the main sections first. */
export async function listSavedPages(): Promise<{ path: string; title: string }[]> {
  if (!("caches" in window)) return [];

  const cache = await caches.open(PAGE_CACHE);
  const paths = [...new Set((await cache.keys()).map((request) => new URL(request.url).pathname))];

  return paths
    .filter((path) => path !== "/offline")
    .map((path) => ({ path, title: TITLES[path] ?? path }))
    .sort((a, b) => Number(b.path in TITLES) - Number(a.path in TITLES) || a.path.localeCompare(b.path));
}

/** Portfolio figures stay on the device until cleared: on logout and when switching profile. */
export async function clearSavedPages(): Promise<void> {
  if ("caches" in window) {
    await caches.delete(PAGE_CACHE);
  }
}
