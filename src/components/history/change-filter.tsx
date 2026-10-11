"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import { HOLDING_STATUS_LABEL } from "@/components/shared/holding-status-badge";
import type { HoldingChangeStatus } from "@/lib/portfolio/comparison/snapshot-comparator";
import { cn } from "@/lib/utils";

export type StatusFilter = "ALL" | HoldingChangeStatus;

export const CHANGE_TABLE_ID = "security-changes";

type ChangeFilterState = { filter: StatusFilter; setFilter: (filter: StatusFilter) => void };

const ChangeFilterContext = createContext<ChangeFilterState | null>(null);

/** Shares the holdings table's change filter with other controls on the page, such as the summary counts. */
export function ChangeFilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  return <ChangeFilterContext value={{ filter, setFilter }}>{children}</ChangeFilterContext>;
}

/** Null outside a provider, where the table keeps its own filter. */
export function useChangeFilter(): ChangeFilterState | null {
  return useContext(ChangeFilterContext);
}

/** Counts per change that filter the holdings table when pressed; pressing the active one shows all again. */
export function ChangeCounts({ counts }: { counts: { status: HoldingChangeStatus; value: number }[] }) {
  const shared = useChangeFilter();

  return (
    <div role="group" aria-label="Filter holdings by change" className="flex flex-wrap gap-1.5 text-xs">
      {counts.map((count) => {
        const pressed = shared?.filter === count.status;

        return (
          <button
            key={count.status}
            type="button"
            disabled={count.value === 0 || !shared}
            aria-pressed={pressed}
            onClick={() => {
              shared?.setFilter(pressed ? "ALL" : count.status);
              document.getElementById(CHANGE_TABLE_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className={cn(
              "focus-visible:ring-ring/50 h-7 rounded-full border px-2.5 transition-colors outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50",
              pressed
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background/60 hover:bg-accent hover:text-foreground",
            )}
          >
            <span className="font-semibold tabular-nums">{count.value}</span>{" "}
            {HOLDING_STATUS_LABEL[count.status].toLowerCase()}
          </button>
        );
      })}
    </div>
  );
}
