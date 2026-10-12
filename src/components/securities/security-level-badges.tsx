import type { ReactNode } from "react";

import { Money } from "@/components/currency/money";
import { SignedValue } from "@/components/shared/signed-value";
import { formatSnapshotDate } from "@/lib/format/date";
import { formatPercentage } from "@/lib/format/number";
import { cn } from "@/lib/utils";

export type SecurityLevels = {
  myTarget: number | null;
  analystTarget: number | null;
  stopPrice: number | null;
  accumulationMin: number | null;
  accumulationMax: number | null;
};

export type JudgedPrice = {
  price: number;
  source: "live" | "snapshot";
  /** ISO date of the price. */
  date: string;
};

export function LevelPill({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "bg-background/70 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs whitespace-nowrap",
        className,
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="inline-flex items-center gap-1 font-semibold tabular-nums">{children}</span>
    </span>
  );
}

const distance = (level: number, price: number) => (level / price - 1) * 100;

function Target({ label, level, price }: { label: string; level: number; price: number | null }) {
  const upside = price ? distance(level, price) : null;

  return (
    <LevelPill label={label}>
      <Money value={level} />
      {upside === null ? null : upside <= 0 ? (
        <span className="text-positive">· reached</span>
      ) : (
        <SignedValue value={upside}>· {formatPercentage(upside, 1)}</SignedValue>
      )}
    </LevelPill>
  );
}

/**
 * Targets, stop and buy zone from research, each with how far the price is
 * from it. Before the live quote arrives the snapshot price is used.
 */
export function SecurityLevelBadges({ levels, judged }: { levels: SecurityLevels; judged: JudgedPrice | null }) {
  const price = judged?.price ?? null;
  const { myTarget, analystTarget, stopPrice, accumulationMin, accumulationMax } = levels;
  const hasZone = accumulationMin !== null || accumulationMax !== null;
  const inZone =
    price !== null &&
    hasZone &&
    (accumulationMin === null || price >= accumulationMin) &&
    (accumulationMax === null || price <= accumulationMax);
  const stopHit = price !== null && stopPrice !== null && price <= stopPrice;

  return (
    <>
      {judged ? (
        <LevelPill label={judged.source === "live" ? "Live price" : `Price ${formatSnapshotDate(judged.date)}`}>
          <Money value={judged.price} />
        </LevelPill>
      ) : null}
      {myTarget !== null ? <Target label="My target" level={myTarget} price={price} /> : null}
      {analystTarget !== null ? <Target label="Analyst target" level={analystTarget} price={price} /> : null}
      {hasZone ? (
        <LevelPill label="Buy zone" className={inZone ? "border-positive/40 bg-positive/10" : undefined}>
          {accumulationMin !== null ? <Money value={accumulationMin} /> : "…"}–
          {accumulationMax !== null ? <Money value={accumulationMax} /> : "…"}
          {inZone ? <span className="text-positive">· inside</span> : null}
        </LevelPill>
      ) : null}
      {stopPrice !== null ? (
        <LevelPill label="Stop" className={stopHit ? "border-negative/40 bg-negative/10" : undefined}>
          <Money value={stopPrice} />
          {price === null ? null : stopHit ? (
            <span className="text-negative">· hit</span>
          ) : (
            <span className="text-muted-foreground font-normal">· {formatPercentage(distance(stopPrice, price), 1)}</span>
          )}
        </LevelPill>
      ) : null}
    </>
  );
}
