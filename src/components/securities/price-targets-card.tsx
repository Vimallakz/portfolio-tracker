import Link from "next/link";
import type { ReactNode } from "react";

import { Money } from "@/components/currency/money";
import { RefreshAnalystButton } from "@/components/securities/refresh-analyst-button";
import { SignedValue } from "@/components/shared/signed-value";
import { NotAdviceNote, SignalList } from "@/components/signals/signal-list";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime, formatSnapshotDate } from "@/lib/format/date";
import { formatPercentage } from "@/lib/format/number";
import type { AnalystRatings } from "@/lib/market-data/finnhub";
import type { SecuritySignals } from "@/lib/portfolio/signals/signals";
import { cn } from "@/lib/utils";

type PriceTargetsCardProps = {
  securityId: string;
  hasTicker: boolean;
  /** Null when there is no price to judge: not held and no live quote. */
  entry: SecuritySignals | null;
  ratings: AnalystRatings | null;
  /** ISO timestamp of the stored ratings. */
  ratingsFetchedAt: string | null;
  /** Whether a Finnhub key is configured. */
  ratingsFeed: boolean;
};

function Tile({ label, children, detail }: { label: string; children: ReactNode; detail?: ReactNode }) {
  return (
    <div className="rounded-lg border px-3 py-2.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{children}</dd>
      {detail ? <dd className="text-muted-foreground text-xs tabular-nums">{detail}</dd> : null}
    </div>
  );
}

const upside = (value: number | null) =>
  value === null ? null : <SignedValue value={value}>{formatPercentage(value, 1)} upside</SignedValue>;

export function PriceTargetsCard({ securityId, hasTicker, entry, ratings, ratingsFetchedAt, ratingsFeed }: PriceTargetsCardProps) {
  const researchHref = `/securities/${securityId}/research`;
  const analystTarget = entry?.analystTarget ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price targets</CardTitle>
        <CardDescription>
          {entry
            ? entry.priceSource === "live"
              ? "Live price from Finnhub, compared with your levels and the analyst consensus."
              : `Price from your ${formatSnapshotDate(entry.priceDate)} snapshot, compared with your levels and the analyst consensus.`
            : "No current price: this security is not in your latest snapshot and has no live quote."}
        </CardDescription>
        {ratingsFeed && hasTicker ? (
          <CardAction>
            <RefreshAnalystButton securityId={securityId} />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-5">
        {!hasTicker ? (
          <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-2 text-xs">
            Map a ticker on the{" "}
            <Link href="/securities/mapping" className="text-foreground underline underline-offset-2">
              mapping page
            </Link>{" "}
            to fetch analyst ratings, live prices and news.
          </p>
        ) : null}

        <dl className="grid gap-3 sm:grid-cols-3">
          <Tile
            label={entry?.priceSource === "live" ? "Live price" : "Current price"}
            detail={
              entry?.changeSincePrevious != null && entry.previousDate ? (
                <SignedValue value={entry.changeSincePrevious}>
                  {formatPercentage(entry.changeSincePrevious, 1)} since {formatSnapshotDate(entry.previousDate)}
                </SignedValue>
              ) : undefined
            }
          >
            {entry ? <Money value={entry.price} /> : "—"}
          </Tile>
          <Tile label="My target" detail={entry?.myTarget ? upside(entry.myUpside) : <AddInResearch href={researchHref} />}>
            {entry?.myTarget ? <Money value={entry.myTarget} /> : "Not set"}
          </Tile>
          <Tile
            label="Analyst target"
            detail={analystTarget ? upside(entry?.analystUpside ?? null) : <AddInResearch href={researchHref} hint="from Tickertape" />}
          >
            {analystTarget ? <Money value={analystTarget} /> : "Not set"}
          </Tile>
        </dl>

        {entry ? <PriceLadder entry={entry} analystTarget={analystTarget} /> : null}

        {ratings ? <RatingsBar ratings={ratings} fetchedAt={ratingsFetchedAt} /> : null}

        {entry && entry.signals.length > 0 ? (
          <div className="grid gap-3">
            <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Signals</h3>
            <SignalList signals={entry.signals} />
          </div>
        ) : entry ? (
          <p className="text-muted-foreground text-sm">No signals right now. The price is between your levels.</p>
        ) : null}

        <NotAdviceNote />
      </CardContent>
    </Card>
  );
}

type Marker = { label: string; price: number; className: string };

/** Stop, buy zone, price and both targets on one scale. */
function PriceLadder({ entry, analystTarget }: { entry: SecuritySignals; analystTarget: number | null }) {
  const markers: Marker[] = [
    { label: "Stop", price: entry.stopPrice ?? Number.NaN, className: "bg-negative" },
    { label: "Price", price: entry.price, className: "bg-foreground" },
    { label: "My target", price: entry.myTarget ?? Number.NaN, className: "bg-chart-1" },
    { label: "Analysts", price: analystTarget ?? Number.NaN, className: "bg-chart-2" },
    { label: "Avg cost", price: entry.averageBuyPrice ?? Number.NaN, className: "bg-muted-foreground" },
  ].filter((marker) => Number.isFinite(marker.price));

  const zone = [entry.accumulationMin, entry.accumulationMax];
  const values = [...markers.map((m) => m.price), ...zone.filter((v): v is number => v !== null)];

  if (markers.length < 2) {
    return null;
  }

  const low = Math.min(...values) * 0.95;
  const high = Math.max(...values) * 1.05;
  const position = (price: number) => ((price - low) / (high - low)) * 100;
  const zoneStart = position(entry.accumulationMin ?? low);
  const zoneEnd = position(entry.accumulationMax ?? high);
  const hasZone = entry.accumulationMin !== null || entry.accumulationMax !== null;

  return (
    <div className="grid gap-2">
      <div className="relative h-2 rounded-full bg-muted" role="img" aria-label="Price compared with your levels">
        {hasZone ? (
          <div
            className="bg-positive/30 absolute inset-y-0 rounded-full"
            style={{ left: `${zoneStart}%`, width: `${Math.max(zoneEnd - zoneStart, 1)}%` }}
            title="Your buy zone"
          />
        ) : null}
        {markers.map((marker) => (
          <span
            key={marker.label}
            className={cn(
              "ring-background absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2",
              marker.className,
              marker.label === "Price" && "size-4",
            )}
            style={{ left: `${position(marker.price)}%` }}
            title={marker.label}
          />
        ))}
      </div>
      <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {[...markers]
          .sort((a, b) => a.price - b.price)
          .map((marker) => (
            <li key={marker.label} className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", marker.className)} aria-hidden="true" />
              {marker.label} <Money value={marker.price} />
            </li>
          ))}
        {hasZone ? (
          <li className="flex items-center gap-1.5">
            <span className="bg-positive/30 h-2 w-3 rounded-sm" aria-hidden="true" />
            Buy zone
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function AddInResearch({ href, hint }: { href: string; hint?: string }) {
  return (
    <Link href={href} className="hover:text-foreground underline underline-offset-2">
      Add in research{hint ? ` ${hint}` : ""}
    </Link>
  );
}

function RatingsBar({ ratings, fetchedAt }: { ratings: AnalystRatings; fetchedAt: string | null }) {
  const buy = (ratings.strongBuy ?? 0) + (ratings.buy ?? 0);
  const hold = ratings.hold ?? 0;
  const sell = (ratings.sell ?? 0) + (ratings.strongSell ?? 0);
  const total = buy + hold + sell;

  if (total === 0) {
    return null;
  }

  const segments = [
    { label: "Buy", count: buy, className: "bg-positive" },
    { label: "Hold", count: hold, className: "bg-muted-foreground/50" },
    { label: "Sell", count: sell, className: "bg-negative" },
  ];

  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground font-medium tracking-wide uppercase">Analyst ratings</span>
        <span className="text-muted-foreground">
          {total} analyst{total === 1 ? "" : "s"} · Finnhub{fetchedAt ? `, ${formatRelativeTime(fetchedAt)}` : ""}
        </span>
      </div>
      <div className="bg-muted flex h-2 overflow-hidden rounded-full">
        {segments.map((segment) =>
          segment.count > 0 ? (
            <div key={segment.label} className={segment.className} style={{ width: `${(segment.count / total) * 100}%` }} />
          ) : null,
        )}
      </div>
      <p className="text-muted-foreground text-xs tabular-nums">
        {segments.map((segment) => `${segment.count} ${segment.label}`).join(" · ")}
      </p>
    </div>
  );
}
