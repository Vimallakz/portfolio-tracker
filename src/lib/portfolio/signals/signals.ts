import type { Conviction, InvestmentStatus } from "@/generated/prisma/enums";
import { formatSnapshotDate } from "@/lib/format/date";

/** Every rule's threshold in one place, so they are easy to tune. */
export const SIGNAL_THRESHOLDS = {
  /** A fall this large since the previous snapshot counts as a dip. */
  dipPercent: 5,
  /** Analyst upside at or above this is worth pointing out. */
  analystUpsidePercent: 20,
  /** My upside and analyst upside further apart than this, in percentage points. */
  targetGapPoints: 25,
  /** Within this much below my target counts as near it. */
  nearTargetPercent: 5,
  staleResearchDays: 90,
} as const;

export type SignalInput = {
  securityId: string;
  name: string;
  ticker: string | null;
  /** The price the signals judge: a live quote when available, else the latest snapshot's. */
  price: number;
  priceSource: "live" | "snapshot";
  /** ISO date of the price. */
  priceDate: string;
  /** The last snapshot price before `price`, for the change since then. */
  previousPrice: number | null;
  previousDate: string | null;
  /** Null when the security is not currently held. */
  averageBuyPrice: number | null;
  isHeld: boolean;
  myTarget: number | null;
  analystTarget: number | null;
  accumulationMin: number | null;
  accumulationMax: number | null;
  stopPrice: number | null;
  conviction: Conviction | null;
  investmentStatus: InvestmentStatus | null;
  /** ISO timestamp; null when there is no research note. */
  researchUpdatedAt: string | null;
};

export type SignalKind =
  | "stop-hit"
  | "above-my-target"
  | "near-my-target"
  | "above-analyst-target"
  | "dip"
  | "below-cost"
  | "in-zone"
  | "analyst-upside"
  | "target-gap"
  | "stale-research"
  | "no-target";

/** Opportunity: a reason to add. Action: a reason to review the position now. Review: housekeeping. */
export type SignalGroup = "opportunity" | "action" | "review";

export type Signal = {
  kind: SignalKind;
  group: SignalGroup;
  tone: "positive" | "negative" | "neutral";
  title: string;
  detail: string;
};

export type SecuritySignals = SignalInput & {
  /** Percentage change from previousPrice to price. */
  changeSincePrevious: number | null;
  myUpside: number | null;
  analystUpside: number | null;
  /** Below average cost, as a positive percentage; null when at or above it. */
  belowCostPercent: number | null;
  signals: Signal[];
  /** 0–100, for ranking opportunities only. */
  score: number;
};

const CONVICTION_POINTS: Record<Conviction, number> = { LOW: 0, MEDIUM: 5, HIGH: 10, VERY_HIGH: 15 };

const percentChange = (from: number | null, to: number) => (from && from > 0 ? (to / from - 1) * 100 : null);
const pct = (value: number) => `${Math.abs(value).toFixed(1)}%`;
const DAY_MS = 24 * 60 * 60 * 1000;

export function evaluateSignals(input: SignalInput, now: Date = new Date()): SecuritySignals {
  const t = SIGNAL_THRESHOLDS;
  const { price } = input;
  const signals: Signal[] = [];

  const changeSincePrevious = percentChange(input.previousPrice, price);
  const myUpside = input.myTarget ? (input.myTarget / price - 1) * 100 : null;
  const analystUpside = input.analystTarget ? (input.analystTarget / price - 1) * 100 : null;
  const costChange = input.isHeld ? percentChange(input.averageBuyPrice, price) : null;
  const belowCostPercent = costChange !== null && costChange < 0 ? -costChange : null;
  const inZone =
    (input.accumulationMin !== null || input.accumulationMax !== null) &&
    (input.accumulationMin === null || price >= input.accumulationMin) &&
    (input.accumulationMax === null || price <= input.accumulationMax);

  if (input.stopPrice !== null && price <= input.stopPrice) {
    signals.push({
      kind: "stop-hit",
      group: "action",
      tone: "negative",
      title: "At or below your stop price",
      detail: "The exit level you set has been reached. Decide whether to sell or move the stop.",
    });
  }

  if (myUpside !== null && myUpside <= 0) {
    signals.push({
      kind: "above-my-target",
      group: "action",
      tone: "positive",
      title: myUpside === 0 ? "Reached your target" : `${pct(myUpside)} above your target`,
      detail: "Review the thesis: raise the target, or consider taking some profit.",
    });
  } else if (myUpside !== null && myUpside <= t.nearTargetPercent) {
    signals.push({
      kind: "near-my-target",
      group: "action",
      tone: "positive",
      title: `Within ${pct(myUpside)} of your target`,
      detail: "Close to where you planned to review. Decide what you will do when it gets there.",
    });
  }

  if (analystUpside !== null && analystUpside < 0) {
    signals.push({
      kind: "above-analyst-target",
      group: "action",
      tone: "neutral",
      title: `${pct(analystUpside)} above the analyst target`,
      detail: "Priced beyond the consensus target, so analysts see limited upside from here.",
    });
  }

  if (changeSincePrevious !== null && changeSincePrevious <= -t.dipPercent && input.previousDate) {
    signals.push({
      kind: "dip",
      group: "opportunity",
      tone: "negative",
      title: `Down ${pct(changeSincePrevious)} since ${formatSnapshotDate(input.previousDate)}`,
      detail: "Cheaper than at the previous snapshot. A possible time to add, if your thesis still holds.",
    });
  }

  if (belowCostPercent !== null) {
    signals.push({
      kind: "below-cost",
      group: "opportunity",
      tone: "neutral",
      title: `${pct(belowCostPercent)} below your average cost`,
      detail: "Adding at this price would lower your average buy price.",
    });
  }

  if (inZone) {
    signals.push({
      kind: "in-zone",
      group: "opportunity",
      tone: "positive",
      title: "Inside your buy zone",
      detail: "The price is within the accumulation range you set.",
    });
  }

  if (analystUpside !== null && analystUpside >= t.analystUpsidePercent) {
    signals.push({
      kind: "analyst-upside",
      group: "opportunity",
      tone: "positive",
      title: `Analysts see ${pct(analystUpside)} upside`,
      detail: "The analyst target is well above the current price.",
    });
  }

  if (myUpside !== null && analystUpside !== null && Math.abs(myUpside - analystUpside) > t.targetGapPoints) {
    const cautious = myUpside < analystUpside;
    signals.push({
      kind: "target-gap",
      group: "review",
      tone: "neutral",
      title: cautious ? "You are more cautious than analysts" : "You are more optimistic than analysts",
      detail: `Your target implies ${myUpside >= 0 ? "+" : "-"}${pct(myUpside)}, analysts ${analystUpside >= 0 ? "+" : "-"}${pct(analystUpside)}. Worth re-checking your target.`,
    });
  }

  if (input.researchUpdatedAt) {
    const ageDays = Math.floor((now.getTime() - new Date(input.researchUpdatedAt).getTime()) / DAY_MS);
    if (ageDays > t.staleResearchDays) {
      signals.push({
        kind: "stale-research",
        group: "review",
        tone: "neutral",
        title: `Research is ${ageDays} days old`,
        detail: "Re-read your thesis and update the targets so the signals stay meaningful.",
      });
    }
  }

  if (input.isHeld && input.myTarget === null && input.analystTarget === null) {
    signals.push({
      kind: "no-target",
      group: "review",
      tone: "neutral",
      title: "No target price yet",
      detail: "Add your own target or the analyst target to unlock upside signals.",
    });
  }

  return {
    ...input,
    changeSincePrevious,
    myUpside,
    analystUpside,
    belowCostPercent,
    signals,
    score: opportunityScore(signals, { changeSincePrevious, belowCostPercent, analystUpside, conviction: input.conviction }),
  };
}

function opportunityScore(
  signals: Signal[],
  facts: { changeSincePrevious: number | null; belowCostPercent: number | null; analystUpside: number | null; conviction: Conviction | null },
): number {
  const has = (kind: SignalKind) => signals.some((signal) => signal.kind === kind);

  if (!signals.some((signal) => signal.group === "opportunity") || has("stop-hit")) {
    return 0;
  }

  let score = 0;
  if (has("dip")) score += Math.min(-(facts.changeSincePrevious ?? 0), 20) * 2;
  if (has("below-cost")) score += Math.min(facts.belowCostPercent ?? 0, 20) * 1.5;
  if (has("in-zone")) score += 20;
  if (facts.analystUpside !== null && facts.analystUpside > 0) score += Math.min(facts.analystUpside, 50) * 0.4;
  if (facts.conviction) score += CONVICTION_POINTS[facts.conviction];
  if (has("above-my-target") || has("above-analyst-target")) score -= 20;

  return Math.round(Math.max(0, Math.min(100, score)));
}

/** Securities with at least one signal in the group; opportunities best first. */
export function signalsInGroup(all: SecuritySignals[], group: SignalGroup): SecuritySignals[] {
  const matching = all.filter((entry) => entry.signals.some((signal) => signal.group === group));
  return group === "opportunity" ? matching.sort((a, b) => b.score - a.score) : matching;
}

const ACTION_ORDER: SignalKind[] = ["stop-hit", "above-my-target", "near-my-target", "above-analyst-target"];

/** The few most important signals across the portfolio, for the Dashboard. */
export function topSignals(all: SecuritySignals[], limit = 3): { entry: SecuritySignals; signal: Signal }[] {
  const actions = all
    .flatMap((entry) => entry.signals.filter((signal) => signal.group === "action").map((signal) => ({ entry, signal })))
    .sort((a, b) => ACTION_ORDER.indexOf(a.signal.kind) - ACTION_ORDER.indexOf(b.signal.kind));

  const opportunities = signalsInGroup(all, "opportunity").map((entry) => ({
    entry,
    signal: entry.signals.find((signal) => signal.group === "opportunity")!,
  }));

  return [...actions, ...opportunities].slice(0, limit);
}
