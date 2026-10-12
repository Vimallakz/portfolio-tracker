import type { ExtensionSecurity } from "../../src/lib/extension/contract";
import { cardRows, chipView } from "./format";
import { DATA_VERSION_KEY, send } from "./messages";
import { LIST_PAGE, ROW, STOCK_LINK, STOCK_PAGE, STOCK_TITLE, slugFromHref, slugFromPath } from "./selectors";
import { CARD_CSS, CHIP_CSS } from "./styles";

const CHIP_TAG = "pi-target-chip";
const CARD_TAG = "pi-target-card";

type Data = { generatedAt: string; profileName: string; bySlug: Map<string, ExtensionSecurity> };

let data: Data | null = null;
let openCard: { host: HTMLElement; chip: HTMLElement } | null = null;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);

  if (className) {
    node.className = className;
  }

  if (text !== undefined) {
    node.textContent = text;
  }

  return node;
}

function closeCard() {
  openCard?.host.remove();
  openCard = null;
}

function cardContent(slug: string, security: ExtensionSecurity | undefined, profileName: string) {
  const card = el("div", "card");
  const head = el("div", "head");
  head.append(el("span", "name", security?.name ?? slug), el("span", "ticker", slug));
  card.append(head);

  if (!security) {
    card.append(el("p", "empty", `No research or holding for ${slug} in ${profileName}.`));
    return card;
  }

  const badges = el("div", "badges");

  for (const label of [security.statusLabel, security.convictionLabel ? `${security.convictionLabel} conviction` : null]) {
    if (label) {
      badges.append(el("span", "badge", label));
    }
  }

  if (!security.statusLabel) {
    badges.append(el("span", "badge", "No research yet"));
  }

  card.append(badges);

  const list = el("dl");

  for (const row of cardRows(security)) {
    const value = el("dd", undefined, row.value);

    if (row.note) {
      value.append(el("span", `note ${row.tone ?? "muted"}`, row.note));
    }

    list.append(el("dt", undefined, row.label), value);
  }

  card.append(list);

  if (security.signals.length > 0) {
    const signals = el("ul");

    for (const signal of security.signals) {
      signals.append(el("li", signal.tone === "neutral" ? undefined : signal.tone, signal.title));
    }

    card.append(el("h3", undefined, "Signals"), signals);
  }

  const foot = el("div", "foot");
  const link = el("a", undefined, "Open in Portfolio ↗");
  link.href = security.url;
  link.target = "_blank";
  link.rel = "noreferrer";
  foot.append(el("span", undefined, profileName), link);
  card.append(foot);

  return card;
}

function placeCard(host: HTMLElement, card: HTMLElement, anchor: HTMLElement) {
  const rect = anchor.getBoundingClientRect();
  const { width, height } = card.getBoundingClientRect();
  const margin = 8;
  const below = rect.bottom + 6;
  const top = below + height > window.innerHeight - margin ? Math.max(margin, rect.top - 6 - height) : below;
  const left = Math.min(Math.max(margin, rect.left), window.innerWidth - width - margin);

  host.style.top = `${top}px`;
  host.style.left = `${left}px`;
}

function toggleCard(chip: HTMLElement, slug: string) {
  const wasOpen = openCard?.chip === chip;
  closeCard();

  if (wasOpen || !data) {
    return;
  }

  const host = document.createElement(CARD_TAG);
  const root = host.attachShadow({ mode: "open" });
  const card = cardContent(slug, data.bySlug.get(slug), data.profileName);
  root.append(el("style", undefined, CARD_CSS), card);
  host.setAttribute("role", "dialog");
  host.setAttribute("aria-label", `${slug} in Portfolio Intelligence`);
  document.documentElement.append(host);
  placeCard(host, card, chip);
  openCard = { host, chip };
}

function createChip(slug: string): HTMLElement {
  const host = document.createElement(CHIP_TAG);
  host.dataset.slug = slug;

  const root = host.attachShadow({ mode: "open" });
  const view = chipView(data?.bySlug.get(slug));
  const button = el("button", view.tone);
  button.type = "button";
  button.title = "Portfolio Intelligence";

  if (view.stopHit) {
    button.append(el("span", "stop"));
  }

  button.append(view.text);
  root.append(el("style", undefined, CHIP_CSS), button);

  // The chip often sits inside a row link; keep Tickertape from navigating or opening the row.
  for (const type of ["pointerdown", "mousedown", "mouseup", "touchstart"]) {
    host.addEventListener(type, (event) => event.stopPropagation());
  }

  host.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleCard(host, slug);
  });

  return host;
}

function bottomOf(node: Node): number | null {
  if (node instanceof Element) {
    return node.getBoundingClientRect().bottom;
  }

  const range = document.createRange();
  range.selectNodeContents(node);
  const rect = range.getBoundingClientRect();
  return rect.height > 0 ? rect.bottom : null;
}

/** A chip that wrapped below its link's content (e.g. under a button) gets room above it instead of beside it. */
function markStacked(chip: HTMLElement) {
  const previous = chip.previousSibling;
  const previousBottom = previous ? bottomOf(previous) : null;

  chip.toggleAttribute("data-stacked", previousBottom !== null && chip.getBoundingClientRect().top >= previousBottom - 1);
}

function decorateList() {
  for (const link of document.querySelectorAll<HTMLAnchorElement>(STOCK_LINK)) {
    const slug = slugFromHref(link.getAttribute("href") ?? "");

    if (!slug || link.querySelector(CHIP_TAG) || !link.textContent?.trim()) {
      continue;
    }

    const row = link.closest(ROW);

    if (row?.querySelector(`${CHIP_TAG}[data-slug="${CSS.escape(slug)}"]`)) {
      continue;
    }

    const chip = createChip(slug);
    link.append(chip);
    markStacked(chip);
  }
}

function decorateStockPage(slug: string) {
  for (const title of document.querySelectorAll<HTMLElement>(STOCK_TITLE)) {
    if (!title.querySelector(CHIP_TAG)) {
      title.append(createChip(slug));
    }
  }
}

let lastPath = location.pathname;

function decorate() {
  if (location.pathname !== lastPath) {
    lastPath = location.pathname;
    clearChips();
  }

  if (!data) {
    return;
  }

  if (LIST_PAGE.test(location.pathname)) {
    decorateList();
    return;
  }

  const slug = STOCK_PAGE.test(location.pathname) ? slugFromPath(location.pathname) : null;

  if (slug) {
    decorateStockPage(slug);
  }
}

function clearChips() {
  closeCard();
  document.querySelectorAll(CHIP_TAG).forEach((chip) => chip.remove());
}

async function load() {
  let result;

  try {
    result = await send({ type: "getSecurities" });
  } catch {
    // The extension was reloaded or removed; this page's script is orphaned.
    observer.disconnect();
    return;
  }

  if (result.status === "ok" && result.data.generatedAt === data?.generatedAt) {
    return;
  }

  clearChips();

  if (result.status !== "ok") {
    data = null;
    return;
  }

  data = {
    generatedAt: result.data.generatedAt,
    profileName: result.data.profile.name,
    bySlug: new Map(result.data.securities.map((security) => [security.slug, security])),
  };
  decorate();
}

let scheduled = 0;

const observer = new MutationObserver(() => {
  if (!scheduled) {
    scheduled = window.setTimeout(() => {
      scheduled = 0;
      decorate();
    }, 150);
  }
});

observer.observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && openCard) {
    const { chip } = openCard;
    closeCard();
    chip.shadowRoot?.querySelector("button")?.focus();
  }
});

document.addEventListener(
  "pointerdown",
  (event) => {
    if (openCard && !event.composedPath().some((node) => node === openCard!.host || node === openCard!.chip)) {
      closeCard();
    }
  },
  true,
);

window.addEventListener("resize", closeCard);
window.addEventListener(
  "scroll",
  (event) => {
    if (openCard && event.target !== openCard.host) {
      closeCard();
    }
  },
  { capture: true, passive: true },
);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && DATA_VERSION_KEY in changes) {
    void load();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    void load();
  }
});

void load();
