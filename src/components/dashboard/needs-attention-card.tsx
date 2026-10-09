import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { SignalIcon } from "@/components/signals/signal-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listProfileSignals } from "@/lib/portfolio/signals/queries";
import { topSignals } from "@/lib/portfolio/signals/signals";

/** Streams in behind Suspense, since it may fetch live quotes. */
export async function NeedsAttentionCard({ profileId }: { profileId: string }) {
  const { entries } = await listProfileSignals(profileId);
  const top = topSignals(entries, 3);
  const withTargets = entries.some((entry) => entry.myTarget !== null || entry.analystTarget !== null);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Needs attention</CardTitle>
        <CardDescription>
          {top.length > 0 ? "The most important signals across your holdings." : "Nothing stands out right now."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {top.length > 0 ? (
          <ul className="grid gap-2.5">
            {top.map(({ entry, signal }) => (
              <li key={`${entry.securityId}-${signal.kind}`}>
                <Link href={`/securities/${entry.securityId}`} className="group flex items-start gap-2.5">
                  <SignalIcon signal={signal} />
                  <span className="min-w-0 text-sm">
                    <span className="group-hover:text-primary font-medium">{entry.ticker ?? entry.name}</span>
                    <span className="text-muted-foreground block text-xs">{signal.title}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : !withTargets ? (
          <p className="text-muted-foreground text-xs">Add target prices in your research to get buy and review signals.</p>
        ) : null}
        <Link
          href="/focus"
          className="text-primary inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
        >
          Open My Focus
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}

export function NeedsAttentionSkeleton() {
  return (
    <Card size="sm" aria-busy="true">
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="grid gap-2.5">
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
      </CardContent>
    </Card>
  );
}
