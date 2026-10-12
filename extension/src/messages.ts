import type { ExtensionProfile, ExtensionSecuritiesResponse } from "../../src/lib/extension/contract";

declare const __DEFAULT_APP_URL__: string | undefined;

/** Set at build time; the live app's own download points at the live app. Tests run unbundled. */
export const DEFAULT_APP_URL = typeof __DEFAULT_APP_URL__ === "string" ? __DEFAULT_APP_URL__ : "http://localhost:3000";

/** Kept in chrome.storage.local. The token never leaves the extension. */
export type StoredAuth = {
  appUrl: string;
  token: string | null;
  user: { email: string; name: string | null } | null;
  profiles: ExtensionProfile[];
  profileId: string | null;
  notice: string | null;
};

/** Content scripts watch this key and reload their data whenever it changes. */
export const DATA_VERSION_KEY = "dataVersion";

export type PopupState = Omit<StoredAuth, "token"> & { signedIn: boolean; fetchedAt: string | null };

export type SecuritiesResult =
  | { status: "ok"; data: ExtensionSecuritiesResponse }
  | { status: "signed-out" }
  | { status: "no-profile" }
  | { status: "error"; error: string };

export type Request =
  | { type: "getState" }
  | { type: "login"; appUrl: string; email: string; password: string; deviceName: string }
  | { type: "selectProfile"; profileId: string }
  | { type: "logout" }
  | { type: "refresh" }
  | { type: "getSecurities" };

export type ActionResponse = { ok: true } | { ok: false; error: string };

export type ResponseFor<T extends Request["type"]> = T extends "getState"
  ? PopupState
  : T extends "getSecurities"
    ? SecuritiesResult
    : ActionResponse;

export function send<T extends Request>(request: T): Promise<ResponseFor<T["type"]>> {
  return chrome.runtime.sendMessage(request);
}

/** "http://localhost:3000/" or "localhost:3000" both become "http://localhost:3000"; other bare hosts get https. */
export function normalizeAppUrl(input: string): string | null {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  const scheme = /^(localhost|127\.0\.0\.1)(:|\/|$)/i.test(trimmed) ? "http" : "https";
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `${scheme}://${trimmed}`;

  try {
    return new URL(withScheme).origin;
  } catch {
    return null;
  }
}
