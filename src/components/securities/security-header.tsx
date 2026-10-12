import { ArrowLeft, ExternalLink, NotebookPen } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Money } from "@/components/currency/money";
import { ConvictionStars } from "@/components/research/conviction-stars";
import { LevelPill } from "@/components/securities/security-level-badges";
import { SignedValue } from "@/components/shared/signed-value";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { InvestmentStatus } from "@/generated/prisma/enums";
import { formatSnapshotDate } from "@/lib/format/date";
import { formatPercentage, formatQuantity } from "@/lib/format/number";
import type { SecurityDetail, SecurityHistoryRow } from "@/lib/portfolio/securities/queries";
import { findTickertapeUrl } from "@/lib/portfolio/securities/ticker";
import { CONVICTION_LABEL, INVESTMENT_STATUS_LABEL } from "@/lib/research/labels";

const weightFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

const STATUS_CLASS: Record<InvestmentStatus, string> = {
  WATCH: "border-dashed",
  ACCUMULATE: "border-positive/40 bg-positive/10 text-positive",
  HOLD: "bg-secondary",
  REDUCE: "border-warning/50 bg-warning/10 text-warning",
  EXIT: "border-negative/40 bg-negative/10 text-negative",
};

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums">{children}</dd>
    </div>
  );
}

function Position({ position }: { position: SecurityHistoryRow }) {
  const lost = position.pnlAmount < 0;

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <p className="text-muted-foreground text-xs font-medium">
          Current value · as of {formatSnapshotDate(position.snapshotDate)}
        </p>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="text-4xl font-semibold tracking-tight tabular-nums">
            <Money value={position.currentValue} />
          </p>
          <p className="text-sm tabular-nums">
            <SignedValue value={position.pnlAmount} className="text-base font-semibold">
              {formatPercentage(position.pnlPercentage)}{" "}
              <span className="font-medium">
                (<Money value={position.pnlAmount} change />)
              </span>
            </SignedValue>{" "}
            <span className="text-muted-foreground">
              {lost ? "loss" : "profit"} on <Money value={position.investedAmount} /> invested
            </span>
          </p>
        </div>
      </div>
      <dl className="bg-background/60 grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border px-4 py-3 sm:grid-cols-4">
        <Fact label="Quantity">{formatQuantity(position.quantity)}</Fact>
        <Fact label="Average buy">
          <Money value={position.averageBuyPrice} />
        </Fact>
        <Fact label="Snapshot price">
          <Money value={position.currentPrice} />
        </Fact>
        <Fact label="Portfolio weight">{weightFormat.format(position.weight)}%</Fact>
      </dl>
    </div>
  );
}

type SecurityHeaderProps = Pick<SecurityDetail, "security" | "tags" | "research" | "position" | "latestSnapshotDate"> & {
  /** The most recent snapshot that held it, for a security no longer held. */
  lastHeld: SecurityHistoryRow | undefined;
  /** Target, zone and stop badges; they stream in with the live price. */
  levelBadges: ReactNode;
  /** Live quote; streams in. */
  livePrice: ReactNode;
};

/** Everything needed to judge the holding at a glance: value, P&L, plan and targets. */
export function SecurityHeader({
  security,
  tags,
  research,
  position,
  latestSnapshotDate,
  lastHeld,
  levelBadges,
  livePrice,
}: SecurityHeaderProps) {
  const tickertapeUrl = findTickertapeUrl(security);

  return (
    <header className="from-primary/10 via-primary/5 bg-card mb-4 grid gap-5 overflow-hidden rounded-2xl border bg-gradient-to-br to-transparent px-5 pt-4 pb-5 shadow-sm sm:px-6">
      <Link href="/securities" className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm">
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Securities
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
        <div className="grid min-w-0 flex-1 gap-2">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-xl font-semibold tracking-tight">
              {security.ticker ? <span className="mr-2">{security.ticker}</span> : null}
              <span className={security.ticker ? "text-muted-foreground font-normal" : undefined}>{security.name}</span>
            </h1>
            {livePrice}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{security.type === "ETF" ? "ETF" : "Stock"}</Badge>
            {security.ticker ? null : (
              <Badge variant="outline" className="border-warning/50 text-warning">
                No ticker
              </Badge>
            )}
            {tags.map((tag) => (
              <Badge key={tag.id} variant="outline">
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {tickertapeUrl ? (
            <Button asChild size="sm" variant="outline">
              <a href={tickertapeUrl} target="_blank" rel="noopener noreferrer">
                Open Tickertape
                <ExternalLink aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Button>
          ) : null}
          <Button asChild size="sm">
            <Link href={`/securities/${security.id}/research`}>
              <NotebookPen aria-hidden="true" />
              {research ? "Edit research" : "Add research"}
            </Link>
          </Button>
        </div>
      </div>

      {position ? (
        <Position position={position} />
      ) : (
        <p className="text-muted-foreground text-sm">
          Not in your latest snapshot
          {latestSnapshotDate ? ` from ${formatSnapshotDate(latestSnapshotDate)}` : ""}.
          {lastHeld ? ` Last held on ${formatSnapshotDate(lastHeld.snapshotDate)}.` : ""}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {research?.investmentStatus ? (
          <LevelPill label="Status" className={STATUS_CLASS[research.investmentStatus]}>
            {INVESTMENT_STATUS_LABEL[research.investmentStatus]}
          </LevelPill>
        ) : null}
        {research?.conviction ? (
          <span className="bg-background/70 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs">
            <span className="text-muted-foreground">Conviction</span>
            <ConvictionStars conviction={research.conviction} showLabel={false} />
            <span className="font-semibold" aria-hidden="true">
              {CONVICTION_LABEL[research.conviction]}
            </span>
          </span>
        ) : null}
        {levelBadges}
        {research ? null : (
          <Link
            href={`/securities/${security.id}/research`}
            className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
          >
            Add research to see your targets, buy zone and stop here
          </Link>
        )}
      </div>
    </header>
  );
}
