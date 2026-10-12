import type {
  ExtensionErrorResponse,
  ExtensionLoginResponse,
  ExtensionSecuritiesResponse,
} from "../../src/lib/extension/contract";
import {
  DATA_VERSION_KEY,
  DEFAULT_APP_URL,
  type ActionResponse,
  type PopupState,
  type Request,
  type SecuritiesResult,
  type StoredAuth,
} from "./messages";

const AUTH_KEY = "auth";
const CACHE_KEY = "securitiesCache";
/** Quotes in the app are cached for 15 minutes, so polling faster than this gains nothing. */
const CACHE_MS = 5 * 60 * 1000;
const SIGNED_OUT_NOTICE = "You were signed out. Sign in again to see your targets on Tickertape.";

type Cache = { appUrl: string; profileId: string; fetchedAt: number; data: ExtensionSecuritiesResponse };

const emptyAuth = (appUrl = DEFAULT_APP_URL): StoredAuth => ({
  appUrl,
  token: null,
  user: null,
  profiles: [],
  profileId: null,
  notice: null,
});

async function readAuth(): Promise<StoredAuth> {
  const stored = await chrome.storage.local.get(AUTH_KEY);
  return { ...emptyAuth(), ...(stored[AUTH_KEY] as Partial<StoredAuth> | undefined) };
}

async function writeAuth(auth: StoredAuth) {
  await chrome.storage.local.set({ [AUTH_KEY]: auth });
}

async function readCache(): Promise<Cache | null> {
  const stored = await chrome.storage.session.get(CACHE_KEY);
  return (stored[CACHE_KEY] as Cache | undefined) ?? null;
}

/** Drops cached data and tells every Tickertape tab to ask again. */
async function invalidate() {
  await chrome.storage.session.remove(CACHE_KEY);
  await chrome.storage.local.set({ [DATA_VERSION_KEY]: Date.now() });
}

async function showSignInBadge(show: boolean) {
  await chrome.action.setBadgeText({ text: show ? "!" : "" });
  await chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as Partial<ExtensionErrorResponse>;
    return body.error ?? `The app answered ${response.status}.`;
  } catch {
    return `The app answered ${response.status}.`;
  }
}

/** A revoked or expired token: forget it so the popup asks to sign in. */
async function handleUnauthorized(auth: StoredAuth) {
  await writeAuth({ ...emptyAuth(auth.appUrl), notice: SIGNED_OUT_NOTICE });
  await showSignInBadge(true);
  await invalidate();
}

async function login(request: Extract<Request, { type: "login" }>): Promise<ActionResponse> {
  const current = await readAuth();
  let response: Response;

  try {
    response = await fetch(`${request.appUrl}/api/extension/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: request.email, password: request.password, deviceName: request.deviceName }),
    });
  } catch {
    return { ok: false, error: `Could not reach ${request.appUrl}. Is the app running?` };
  }

  if (!response.ok) {
    return { ok: false, error: await readError(response) };
  }

  const body = (await response.json()) as ExtensionLoginResponse;
  const keepProfile = current.appUrl === request.appUrl && body.profiles.some((p) => p.id === current.profileId);

  await writeAuth({
    appUrl: request.appUrl,
    token: body.token,
    user: body.user,
    profiles: body.profiles,
    profileId: keepProfile ? current.profileId : (body.profiles[0]?.id ?? null),
    notice: null,
  });
  await showSignInBadge(false);
  await invalidate();

  return { ok: true };
}

async function logout(): Promise<ActionResponse> {
  const auth = await readAuth();

  if (auth.token) {
    // Best effort: the token is forgotten locally even if the app is unreachable.
    await fetch(`${auth.appUrl}/api/extension/logout`, {
      method: "POST",
      headers: { authorization: `Bearer ${auth.token}` },
    }).catch(() => undefined);
  }

  await writeAuth(emptyAuth(auth.appUrl));
  await showSignInBadge(false);
  await invalidate();

  return { ok: true };
}

async function selectProfile(profileId: string): Promise<ActionResponse> {
  const auth = await readAuth();

  if (!auth.profiles.some((profile) => profile.id === profileId)) {
    return { ok: false, error: "That profile is not available." };
  }

  await writeAuth({ ...auth, profileId });
  await invalidate();

  return { ok: true };
}

let inFlight: Promise<SecuritiesResult> | null = null;

async function fetchSecurities(auth: StoredAuth & { token: string; profileId: string }): Promise<SecuritiesResult> {
  let response: Response;

  try {
    const url = `${auth.appUrl}/api/extension/securities?profileId=${encodeURIComponent(auth.profileId)}`;
    response = await fetch(url, { headers: { authorization: `Bearer ${auth.token}` } });
  } catch {
    return { status: "error", error: `Could not reach ${auth.appUrl}.` };
  }

  if (response.status === 401) {
    await handleUnauthorized(auth);
    return { status: "signed-out" };
  }

  if (!response.ok) {
    return { status: "error", error: await readError(response) };
  }

  const data = (await response.json()) as ExtensionSecuritiesResponse;
  const cache: Cache = { appUrl: auth.appUrl, profileId: auth.profileId, fetchedAt: Date.now(), data };
  await chrome.storage.session.set({ [CACHE_KEY]: cache });

  return { status: "ok", data };
}

async function getSecurities(): Promise<SecuritiesResult> {
  const auth = await readAuth();

  if (!auth.token) {
    return { status: "signed-out" };
  }

  if (!auth.profileId) {
    return { status: "no-profile" };
  }

  const cache = await readCache();

  if (
    cache &&
    cache.appUrl === auth.appUrl &&
    cache.profileId === auth.profileId &&
    Date.now() - cache.fetchedAt < CACHE_MS
  ) {
    return { status: "ok", data: cache.data };
  }

  // Several tabs asking at once share one request.
  inFlight ??= fetchSecurities({ ...auth, token: auth.token, profileId: auth.profileId }).finally(() => {
    inFlight = null;
  });

  return inFlight;
}

async function getState(): Promise<PopupState> {
  const { token, ...auth } = await readAuth();
  const cache = await readCache();
  const fresh = cache && cache.profileId === auth.profileId && cache.appUrl === auth.appUrl;

  return { ...auth, signedIn: Boolean(token), fetchedAt: fresh ? new Date(cache.fetchedAt).toISOString() : null };
}

async function handle(request: Request): Promise<unknown> {
  switch (request.type) {
    case "getState":
      return getState();
    case "login":
      return login(request);
    case "logout":
      return logout();
    case "selectProfile":
      return selectProfile(request.profileId);
    case "refresh":
      await invalidate();
      return { ok: true };
    case "getSecurities":
      return getSecurities();
  }
}

chrome.runtime.onMessage.addListener((request: Request, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) {
    return false;
  }

  handle(request).then(sendResponse, (error: unknown) =>
    sendResponse({ ok: false, status: "error", error: error instanceof Error ? error.message : "Something went wrong." }),
  );

  // Keeps the channel open for the async reply.
  return true;
});

chrome.runtime.onStartup.addListener(() => {
  void readAuth().then((auth) => showSignInBadge(!auth.token && Boolean(auth.notice)));
});
