import { ArrowDownRight, ArrowUpRight, ExternalLink } from "lucide-react";

import { Money } from "@/components/currency/money";
import { SignedValue } from "@/components/shared/signed-value";
import { formatPercentage } from "@/lib/format/number";
import type { Mover, ReportMovers as Movers } from "@/lib/portfolio/reports/movers";
import { cn } from "@/lib/utils";

function MoverName({ mover }: { mover: Mover }) {
  const label = (linked: boolean) => (
    <>
      <span className="flex min-w-0 items-center gap-1 text-sm font-medium">
        <span className="truncate">{mover.ticker ?? mover.name}</span>
        {linked ? <ExternalLink className="text-muted-foreground size-3 shrink-0 print:hidden" aria-hidden="true" /> : null}
      </span>
      {mover.ticker ? <span className="text-muted-foreground truncate text-xs">{mover.name}</span> : null}
    </>
  );

  if (!mover.tickertapeUrl) {
    return <span className="grid min-w-0 flex-1">{label(false)}</span>;
  }

  return (
    <a
      href={mover.tickertapeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="grid min-w-0 flex-1 rounded-sm hover:underline focus-visible:underline focus-visible:outline-none"
    >
      {label(true)}
      <span className="sr-only">(opens Tickertape in a new tab)</span>
    </a>
  );
}

function MoverList({ title, movers, rising }: { title: string; movers: Mover[]; rising: boolean }) {
  const Icon = rising ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="grid min-w-0 content-start gap-2 rounded-xl border p-4">
      <p className={cn("flex items-center gap-1.5 text-sm font-medium", rising ? "text-positive" : "text-negative")}>
        <Icon className="size-4" aria-hidden="true" />
        {title}
      </p>
      {movers.length === 0 ? (
        <p className="text-muted-foreground text-sm">{rising ? "No holding rose." : "No holding fell."}</p>
      ) : (
        <ol className="divide-y">
          {movers.map((mover) => (
            <li key={mover.securityId} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <MoverName mover={mover} />
              <span className="shrink-0 text-right tabular-nums">
                <SignedValue value={mover.gain} className="block text-sm font-semibold">
                  {formatPercentage(mover.percent)}
                </SignedValue>
                <SignedValue value={mover.gain} className="block text-xs">
                  <Money value={mover.gain} change />
                </SignedValue>
                {mover.isNew ? <span className="text-muted-foreground block text-[11px]">since bought</span> : null}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function ReportMovers({ movers }: { movers: Movers }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
      <MoverList title="Top gainers" movers={movers.gainers} rising />
      <MoverList title="Top losers" movers={movers.losers} rising={false} />
    </div>
  );
}
