import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** The headline card at the top of a page: a tinted gradient, the main figure on the left and details on the right. */
export function HeroCard({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <section
      aria-label={label}
      className="bg-card light:shadow-surface overflow-hidden rounded-2xl ring-1 ring-foreground/10 light:ring-foreground/[0.08]"
    >
      <div
        className={cn(
          "from-primary/10 via-primary/5 grid gap-6 bg-gradient-to-br to-transparent p-5 sm:p-6 lg:grid-cols-[1.2fr_1fr] lg:items-center",
          className,
        )}
      >
        {children}
      </div>
    </section>
  );
}
