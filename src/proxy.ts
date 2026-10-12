import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/session-cookie";

/** The offline page is cached by the service worker; the cron route checks its own bearer secret. */
const PUBLIC_PATHS = ["/login", "/signup", "/offline", "/api/cron/notify"];
/** The browser extension sends a Bearer token instead of the cookie; each handler verifies it. */
const PUBLIC_PREFIXES = ["/api/extension/"];

/**
 * Optimistic check only: it looks for the cookie, not a valid session, so pages
 * without one never render. getCurrentUser() still verifies the session on every
 * request, which also catches expired or revoked cookies.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    request.cookies.has(SESSION_COOKIE)
  ) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") {
    loginUrl.searchParams.set("next", `${pathname}${search}`);
  }

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
