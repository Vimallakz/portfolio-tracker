import { Star } from "lucide-react";

import type { Conviction } from "@/generated/prisma/enums";
import { CONVICTION_LABEL, CONVICTION_STARS } from "@/lib/research/labels";
import { cn } from "@/lib/utils";

const MAX_STARS = 5;

/** Stars are decorative; the label carries the meaning. */
export function ConvictionStars({ conviction, showLabel = true }: { conviction: Conviction; showLabel?: boolean }) {
  const filled = CONVICTION_STARS[conviction];

  return (
    <span className="inline-flex items-center gap-1.5" title={`${CONVICTION_LABEL[conviction]} conviction`}>
      <span className="inline-flex" aria-hidden="true">
        {Array.from({ length: MAX_STARS }, (_, i) => (
          <Star
            key={i}
            className={cn("size-3.5", i < filled ? "fill-warning text-warning" : "text-muted-foreground/40")}
          />
        ))}
      </span>
      <span className={showLabel ? "text-sm" : "sr-only"}>{CONVICTION_LABEL[conviction]}</span>
    </span>
  );
}
