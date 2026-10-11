import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Related figures in one bordered strip, split by hairlines, instead of a card each. */
export function StatStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <dl className={cn("bg-border grid grid-cols-2 gap-px overflow-hidden rounded-xl border lg:grid-cols-4", className)}>
      {children}
    </dl>
  );
}

export function Stat({
  label,
  children,
  detail,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-card grid content-start gap-1 px-4 py-3", className)}>
      <dt className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">{label}</dt>
      <dd className="text-xl font-semibold tracking-tight tabular-nums">{children}</dd>
      {detail ? <dd className="text-muted-foreground text-xs tabular-nums">{detail}</dd> : null}
    </div>
  );
}
