"use client";

import { CornerDownLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import type { SearchableSecurity } from "@/lib/portfolio/securities/queries";
import { searchSecurities } from "@/lib/portfolio/securities/search";
import { cn } from "@/lib/utils";

const subscribeNone = () => () => {};
const detectMac = () => /Mac|iPhone|iPad/.test(navigator.userAgent);

const isTypingIn = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "bg-background text-muted-foreground inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 font-sans text-[0.65rem] font-medium",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/**
 * Spotlight-style search over the profile's securities. ⌘K / Ctrl+K toggles it
 * and "/" opens it from anywhere outside a text field.
 */
export function SecuritySearch({ securities }: { securities: SearchableSecurity[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const isMac = useSyncExternalStore(subscribeNone, detectMac, () => null);

  const results = useMemo(() => searchSecurities(securities, query), [securities, query]);
  const current = Math.min(active, results.length - 1);

  function changeOpen(next: boolean) {
    setOpen(next);
    setQuery("");
    setActive(0);
  }

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((wasOpen) => !wasOpen);
        setQuery("");
        setActive(0);
      } else if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !isTypingIn(event.target)) {
        event.preventDefault();
        setOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${current}"]`)?.scrollIntoView({ block: "nearest" });
  }, [current]);

  function go(security: SearchableSecurity) {
    changeOpen(false);
    router.push(`/securities/${security.id}`);
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive(Math.min(current + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(Math.max(current - 1, 0));
    } else if (event.key === "Enter" && results[current]) {
      event.preventDefault();
      go(results[current]);
    }
  }

  const optionId = (index: number) => `${listId}-option-${index}`;

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground hidden h-9 w-full max-w-sm items-center gap-2 rounded-lg border px-3 text-sm transition-colors sm:flex"
        >
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-left">Search securities…</span>
          {isMac === null ? null : <Kbd className="shrink-0">{isMac ? "⌘K" : "Ctrl K"}</Kbd>}
        </button>
      </Dialog.Trigger>
      <Button variant="ghost" size="icon" aria-label="Search securities" className="sm:hidden" onClick={() => changeOpen(true)}>
        <Search className="size-4" />
      </Button>

      <Dialog.Portal>
        <Dialog.Overlay className="data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="bg-popover text-popover-foreground data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 fixed top-[12vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border shadow-2xl"
        >
          <Dialog.Title className="sr-only">Search securities</Dialog.Title>

          <div className="flex items-center gap-2 border-b px-4">
            <Search className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
            <input
              autoFocus
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={results.length > 0 ? optionId(current) : undefined}
              aria-autocomplete="list"
              aria-label="Search securities"
              placeholder="Search by name or ticker"
              className="placeholder:text-muted-foreground h-12 flex-1 bg-transparent text-base outline-none"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onInputKeyDown}
            />
            <Kbd>esc</Kbd>
          </div>

          <ul ref={listRef} id={listId} role="listbox" aria-label="Securities"
            className={cn("max-h-80 overflow-y-auto p-1.5", results.length === 0 && "hidden")}
          >
            {results.map((security, index) => (
              <li
                key={security.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === current}
                data-index={index}
                onMouseMove={() => setActive(index)}
                onClick={() => go(security)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm",
                  index === current && "bg-accent text-accent-foreground",
                )}
              >
                <span className="w-14 shrink-0 font-semibold tabular-nums">
                  {security.ticker ?? <span className="text-muted-foreground font-normal">—</span>}
                </span>
                <span className="min-w-0 flex-1 truncate">{security.name}</span>
                <span className="text-muted-foreground text-xs">{security.type === "ETF" ? "ETF" : "Stock"}</span>
                <CornerDownLeft className={cn("size-3.5 shrink-0", index === current ? "opacity-60" : "opacity-0")} aria-hidden="true" />
              </li>
            ))}
          </ul>

          {results.length === 0 ? (
            <p className="text-muted-foreground px-4 pt-2 pb-6 text-center text-sm">
              {securities.length === 0 ? "No securities yet. Import a portfolio CSV first." : `No securities match “${query.trim()}”.`}
            </p>
          ) : null}

          <div className="text-muted-foreground bg-muted/40 flex items-center gap-4 border-t px-4 py-2 text-xs">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> to move
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd> to open
            </span>
            <span className="ml-auto">{results.length} of {securities.length}</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
