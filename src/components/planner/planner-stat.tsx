import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

export function PlannerStat({ label, children, detail }: { label: string; children: ReactNode; detail?: ReactNode }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{children}</p>
        {detail ? <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}
