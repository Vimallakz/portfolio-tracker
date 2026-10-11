import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * A card, or just its contents when `embedded` in another card (a tab panel),
 * where the tab already names it. `flush` content runs edge to edge, for tables.
 */
export function CardShell({
  title,
  description,
  actions,
  embedded = false,
  flush = false,
  className,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  embedded?: boolean;
  flush?: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (embedded) {
    return (
      <div className={cn("grid gap-4", flush && "-mb-(--card-spacing)", className)}>
        {description || actions ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            {description ? <p className="text-muted-foreground max-w-prose text-xs">{description}</p> : <span />}
            {actions}
          </div>
        ) : null}
        <div className={cn("grid gap-4", flush && "-mx-(--card-spacing)")}>{children}</div>
      </div>
    );
  }

  return (
    <Card className={cn(flush && "pb-0", className)}>
      <CardHeader className={actions ? "gap-3 sm:grid-cols-[1fr_auto]" : undefined}>
        <div className="grid gap-1">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {actions}
      </CardHeader>
      {flush ? children : <CardContent className="grid gap-4">{children}</CardContent>}
    </Card>
  );
}
