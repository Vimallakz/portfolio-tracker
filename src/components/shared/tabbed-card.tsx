"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStoredChoice } from "@/lib/hooks/use-stored-choice";
import { cn } from "@/lib/utils";

export type CardTab = { id: string; label: string; content: ReactNode };

/**
 * One card that shows one of several panels at a time, so related charts or
 * lists share the space of one. The chosen tab is remembered per `storageKey`.
 * Only the active panel is mounted, so charts measure a visible container.
 */
export function TabbedCard({
  title,
  description,
  tabs,
  defaultTab,
  storageKey,
}: {
  title: string;
  description?: ReactNode;
  tabs: CardTab[];
  defaultTab: string;
  storageKey: string;
}) {
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [activeId, setActiveId] = useStoredChoice(
    storageKey,
    tabs.map((tab) => tab.id),
    defaultTab,
  );
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === activeId),
  );
  const active = tabs[activeIndex];

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;

    event.preventDefault();
    const next = (activeIndex + step + tabs.length) % tabs.length;
    setActiveId(tabs[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <Card>
      <CardHeader className="gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="grid gap-1">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        <div
          role="tablist"
          aria-label={title}
          onKeyDown={onKeyDown}
          className="bg-muted flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-lg p-0.5"
        >
          {tabs.map((tab, index) => {
            const selected = index === activeIndex;

            return (
              <button
                key={tab.id}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveId(tab.id)}
                className={cn(
                  "focus-visible:ring-ring/50 h-8 shrink-0 rounded-md px-3 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3",
                  selected ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${active.id}`}>
        {active.content}
      </CardContent>
    </Card>
  );
}
