"use client";

import { useEffect, useState } from "react";

import { listSavedPages } from "@/lib/pwa/page-cache";

export function SavedPages() {
  const [pages, setPages] = useState<{ path: string; title: string }[]>([]);

  useEffect(() => {
    listSavedPages().then(setPages, () => setPages([]));
  }, []);

  if (pages.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Saved pages" className="grid w-full gap-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Available offline</p>
      <ul className="divide-y rounded-lg border text-left text-sm">
        {pages.map((page) => (
          <li key={page.path}>
            {/* Full loads, which the service worker answers from its cache. */}
            <a href={page.path} className="hover:bg-muted/50 block px-3 py-2.5">
              {page.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
