import { ChartCandlestick } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/** `compact` shows only the mark below sm, to leave the phone header room for controls. */
export function AppLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2" aria-label="Portfolio Intelligence">
      <ChartCandlestick className="light:text-primary size-5" />
      <span className={cn("text-sm font-semibold tracking-tight", compact && "hidden sm:inline")}>
        Portfolio Intelligence
      </span>
    </Link>
  );
}
