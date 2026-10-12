import { DEFAULT_APP_URL, normalizeAppUrl, send, type PopupState } from "./messages";

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const notice = byId<HTMLParagraphElement>("notice");
const loginForm = byId<HTMLFormElement>("login");
const signedIn = byId<HTMLElement>("signed-in");
const userEmail = byId<HTMLElement>("user-email");
const appUrlLabel = byId<HTMLElement>("app-url");
const profileSelect = byId<HTMLSelectElement>("profile");
const fetchedAt = byId<HTMLParagraphElement>("fetched-at");
const refreshButton = byId<HTMLButtonElement>("refresh");
const logoutButton = byId<HTMLButtonElement>("logout");

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

function showNotice(message: string | null) {
  notice.textContent = message ?? "";
  notice.hidden = !message;
}

function deviceName() {
  const platform = navigator.platform.toLowerCase();
  const os = platform.includes("mac")
    ? "Mac"
    : platform.includes("win")
      ? "Windows"
      : platform.includes("linux")
        ? "Linux"
        : "this computer";
  return `Chrome on ${os}`;
}

function render(state: PopupState) {
  showNotice(state.notice);
  loginForm.hidden = state.signedIn;
  signedIn.hidden = !state.signedIn;

  if (!state.signedIn) {
    void restoreDraft(state.appUrl);
    return;
  }

  userEmail.textContent = state.user?.email ?? "";
  appUrlLabel.textContent = state.appUrl;
  profileSelect.replaceChildren(
    ...state.profiles.map((profile) => new Option(profile.name, profile.id, false, profile.id === state.profileId)),
  );
  profileSelect.disabled = state.profiles.length < 2;

  if (state.profiles.length === 0) {
    fetchedAt.textContent = "This account has no investment profiles yet. Create one in the app.";
  } else {
    fetchedAt.textContent = state.fetchedAt
      ? `Data loaded at ${timeFormat.format(new Date(state.fetchedAt))}. Updates every 5 minutes.`
      : "Data loads when you open Tickertape.";
  }
}

async function refreshState() {
  render(await send({ type: "getState" }));
}

/** What was typed before Chrome's permission prompt closed the popup. Never includes the password. */
type LoginDraft = { appUrl: string; email: string };
const DRAFT_KEY = "loginDraft";

const field = (name: string) => loginForm.elements.namedItem(name) as HTMLInputElement;

async function restoreDraft(savedAppUrl: string) {
  const draft = (await chrome.storage.local.get(DRAFT_KEY))[DRAFT_KEY] as LoginDraft | undefined;

  field("appUrl").value ||= draft?.appUrl || savedAppUrl || DEFAULT_APP_URL;
  field("email").value ||= draft?.email ?? "";

  const prompted = draft && !chrome.runtime.getManifest().host_permissions?.includes(`${draft.appUrl}/*`);

  if (prompted && (await chrome.permissions.contains({ origins: [`${draft.appUrl}/*`] }))) {
    showNotice("Access allowed. Enter your password and click Sign in again.");
    field("password").focus();
  }
}

/** The localhost and Tickertape grants are in the manifest; any other app address is asked for once. */
async function ensureHostAccess(appUrl: string): Promise<boolean> {
  const origins = [`${appUrl}/*`];
  return (await chrome.permissions.contains({ origins })) || chrome.permissions.request({ origins });
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = new FormData(loginForm);
  const appUrl = normalizeAppUrl(String(data.get("appUrl") ?? ""));
  const submit = loginForm.querySelector("button") as HTMLButtonElement;

  if (!appUrl) {
    showNotice("Enter the app address, for example http://localhost:3000.");
    return;
  }

  // Chrome's permission prompt closes this popup, so keep what was typed for when it reopens.
  await chrome.storage.local.set({ [DRAFT_KEY]: { appUrl, email: String(data.get("email") ?? "") } satisfies LoginDraft });

  if (!(await ensureHostAccess(appUrl))) {
    showNotice(`The extension needs permission to reach ${appUrl}.`);
    return;
  }

  submit.disabled = true;
  showNotice(null);

  const result = await send({
    type: "login",
    appUrl,
    email: String(data.get("email") ?? ""),
    password: String(data.get("password") ?? ""),
    deviceName: deviceName(),
  });

  submit.disabled = false;

  if (!result.ok) {
    showNotice(result.error);
    return;
  }

  loginForm.reset();
  await chrome.storage.local.remove(DRAFT_KEY);
  await refreshState();
});

profileSelect.addEventListener("change", async () => {
  const result = await send({ type: "selectProfile", profileId: profileSelect.value });

  if (!result.ok) {
    showNotice(result.error);
  }

  await refreshState();
});

refreshButton.addEventListener("click", async () => {
  refreshButton.disabled = true;
  await send({ type: "refresh" });
  const result = await send({ type: "getSecurities" });
  refreshButton.disabled = false;

  if (result.status === "error") {
    showNotice(result.error);
  }

  await refreshState();
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  await send({ type: "logout" });
  logoutButton.disabled = false;
  await refreshState();
});

const appUrls = byId<HTMLDataListElement>("app-urls");
if (![...appUrls.options].some((option) => option.value === DEFAULT_APP_URL)) {
  appUrls.prepend(new Option(DEFAULT_APP_URL, DEFAULT_APP_URL));
}

void refreshState();
