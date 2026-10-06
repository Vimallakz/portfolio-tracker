import type { ReactNode } from "react";

import { signednessOf, type Signedness } from "@/lib/format/number";
import { cn } from "@/lib/utils";

export const SIGNED_TEXT_CLASS: Record<Signedness, string> = {
  positive: "text-positive",
  negative: "text-negative",
  neutral: "text-muted-foreground",
};

/**
 * Colours a formatted figure by its sign. The formatted text must carry the
 * sign itself (+/−) so meaning never depends on colour alone.
 */
export function SignedValue({
  value,
  children,
  className,
}: {
  value: number | null | undefined;
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn(SIGNED_TEXT_CLASS[signednessOf(value)], className)}>{children}</span>;
}
