import Link from "next/link";

import { Money } from "@/components/currency/money";
import { SignedValue } from "@/components/shared/signed-value";
import { SignalList } from "@/components/signals/signal-list";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { formatPercentage } from "@/lib/format/number";
import type { SecuritySignals, SignalGroup } from "@/lib/portfolio/signals/signals";

type FocusSectionProps = {
  title: string;
  description: string;
  group: SignalGroup;
  entries: SecuritySignals[];
  emptyMessage: string;
};

/** One collapsible group; render inside an Accordion with value = group. */
export function FocusSection({ title, description, group, entries, emptyMessage }: FocusSectionProps) {
  return (
    <AccordionItem value={group} className="bg-card text-card-foreground rounded-xl border shadow-sm">
      <AccordionTrigger className="rounded-xl px-6 py-5 hover:bg-muted/40">
        <span className="grid gap-1">
          <span className="flex items-center gap-2 font-semibold">
            {title}
            <Badge variant={entries.length > 0 ? "secondary" : "outline"}>{entries.length}</Badge>
          </span>
          <span className="text-muted-foreground text-sm font-normal">{description}</span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-6 pb-6">
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        ) : (
          <ul className="divide-y">
            {entries.map((entry) => (
              <li key={entry.securityId} className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,14rem)_1fr]">
                <FocusSecurity entry={entry} />
                <SignalList signals={entry.signals.filter((signal) => signal.group === group)} />
              </li>
            ))}
          </ul>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

function FocusSecurity({ entry }: { entry: SecuritySignals }) {
  return (
    <div className="grid content-start gap-1">
      <Link href={`/securities/${entry.securityId}`} className="hover:text-primary font-medium underline-offset-4 hover:underline">
        {entry.ticker ?? entry.name}
      </Link>
      {entry.ticker ? <p className="text-muted-foreground truncate text-xs">{entry.name}</p> : null}
      <p className="text-sm tabular-nums">
        <Money value={entry.price} />
        {entry.changeSincePrevious !== null ? (
          <SignedValue value={entry.changeSincePrevious}>
            <span className="ml-1.5 text-xs">{formatPercentage(entry.changeSincePrevious, 1)}</span>
          </SignedValue>
        ) : null}
        <span className="text-muted-foreground ml-1.5 text-xs">{entry.priceSource === "live" ? "live" : "snapshot"}</span>
      </p>
      <div className="text-muted-foreground flex flex-wrap gap-x-3 text-xs tabular-nums">
        {entry.myUpside !== null ? <span>Mine {formatPercentage(entry.myUpside, 1)}</span> : null}
        {entry.analystUpside !== null ? <span>Analysts {formatPercentage(entry.analystUpside, 1)}</span> : null}
        {!entry.isHeld ? <span>Not held</span> : null}
      </div>
    </div>
  );
}
