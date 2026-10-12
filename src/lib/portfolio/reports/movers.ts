import Decimal from "decimal.js";

import type { SecurityType } from "@/generated/prisma/enums";
import type { SnapshotHoldingRow, SnapshotRow } from "@/lib/portfolio/analytics/dashboard";
import { monthOf } from "@/lib/portfolio/planner/contributions";
import type { ReportPeriod } from "@/lib/portfolio/reports/period";
import { findTickertapeUrl } from "@/lib/portfolio/securities/ticker";

const MOVERS_PER_SIDE = 5;

export type Mover = {
  securityId: string;
  name: string;
  ticker: string | null;
  type: SecurityType;
  /** Null when the security has no valid ticker yet. */
  tickertapeUrl: string | null;
  /** Change in the holding's P&L over the period: price moves only, not new money. */
  gain: number;
  /** gain over the money at work in the holding, 0–100 scale. */
  percent: number;
  /** Bought during the period, so the move is measured from the buy price. */
  isNew: boolean;
};

export type ReportMovers = {
  gainers: Mover[];
  losers: Mover[];
};

const decimal = (value: string | undefined) => new Decimal(value ?? 0);

/**
 * Holdings that rose and fell most over `period`, measured like the report
 * itself: from the last snapshot before the period to the last one inside it.
 * Each holding's gain is its change in P&L, and its percentage is that gain
 * over its value at the start plus the money added, so a stock split, which
 * moves the price but not the value, does not show as a move. Holdings sold
 * during the period are left out: the export has no sale price.
 */
export function buildReportMovers(snapshots: SnapshotRow[], period: ReportPeriod): ReportMovers {
  const before = snapshots.filter((snapshot) => monthOf(snapshot.snapshotDate) < period.start);
  const inside = snapshots.filter((snapshot) => {
    const month = monthOf(snapshot.snapshotDate);
    return month >= period.start && month <= period.end;
  });

  const end = inside.at(-1);
  if (!end) {
    return { gainers: [], losers: [] };
  }

  const startHoldings = new Map<string, SnapshotHoldingRow>(
    (before.at(-1)?.holdings ?? []).map((holding) => [holding.securityId, holding]),
  );

  const movers: Mover[] = [];

  for (const holding of end.holdings) {
    const previous = startHoldings.get(holding.securityId);
    const gain = decimal(holding.pnlAmount).minus(decimal(previous?.pnlAmount));
    const added = decimal(holding.investedAmount).minus(decimal(previous?.investedAmount));
    const base = decimal(previous?.currentValue).plus(added);

    if (gain.isZero() || base.lte(0)) {
      continue;
    }

    movers.push({
      securityId: holding.securityId,
      name: holding.name,
      ticker: holding.ticker,
      type: holding.type,
      tickertapeUrl: findTickertapeUrl({ ticker: holding.ticker, tickertapeTicker: holding.tickertapeTicker ?? null }),
      gain: gain.toNumber(),
      percent: gain.div(base).times(100).toNumber(),
      isNew: !previous,
    });
  }

  return {
    gainers: movers
      .filter((mover) => mover.gain > 0)
      .sort((a, b) => b.percent - a.percent)
      .slice(0, MOVERS_PER_SIDE),
    losers: movers
      .filter((mover) => mover.gain < 0)
      .sort((a, b) => a.percent - b.percent)
      .slice(0, MOVERS_PER_SIDE),
  };
}
