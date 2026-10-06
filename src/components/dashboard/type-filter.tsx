import Link from "next/link";

import { Button } from "@/components/ui/button";
import { TYPE_FILTERS, type TypeFilter as TypeFilterValue } from "@/lib/portfolio/analytics/dashboard";

const LABELS: Record<TypeFilterValue, string> = {
  ALL: "All",
  STOCK: "Stocks",
  ETF: "ETFs",
};

export function TypeFilter({ value }: { value: TypeFilterValue }) {
  return (
    <nav aria-label="Filter by security type" className="bg-muted inline-flex rounded-lg p-0.5">
      {TYPE_FILTERS.map((filter) => {
        const active = filter === value;

        return (
          <Button
            key={filter}
            asChild
            size="sm"
            variant={active ? "secondary" : "ghost"}
            className={active ? "bg-background shadow-sm" : "text-muted-foreground"}
          >
            <Link
              href={filter === "ALL" ? "/dashboard" : `/dashboard?type=${filter.toLowerCase()}`}
              aria-current={active ? "page" : undefined}
              scroll={false}
            >
              {LABELS[filter]}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
