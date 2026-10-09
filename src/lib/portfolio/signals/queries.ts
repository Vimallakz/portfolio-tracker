import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { fetchQuotes, isFinnhubEnabled, type LiveQuote } from "@/lib/market-data/finnhub";
import { evaluateSignals, type SecuritySignals } from "@/lib/portfolio/signals/signals";

const toNumber = (value: Prisma.Decimal) => Number(value.toFixed());
const toNumberOrNull = (value: Prisma.Decimal | null) => (value === null ? null : toNumber(value));
const toDateString = (value: Date) => value.toISOString().slice(0, 10);

export type ProfileSignals = {
  entries: SecuritySignals[];
  latestSnapshotDate: string | null;
  liveQuotes: boolean;
};

/**
 * Signals for every security the profile holds now, plus researched ones it
 * is watching or accumulating (those need a live quote, since no snapshot
 * prices them). The analyst target is the one entered in research.
 */
export async function listProfileSignals(
  profileId: string,
  {
    securityId,
  }: {
    /** Only this security, whether held, watched, or merely researched. */
    securityId?: string;
  } = {},
): Promise<ProfileSignals> {
  const [snapshots, research] = await Promise.all([
    prisma.portfolioSnapshot.findMany({
      where: { profileId },
      orderBy: [{ snapshotDate: "desc" }, { createdAt: "desc" }],
      take: 2,
      select: {
        snapshotDate: true,
        holdings: { select: { securityId: true, currentPrice: true, averageBuyPrice: true } },
      },
    }),
    prisma.securityResearch.findMany({
      where: { profileId },
      select: {
        securityId: true,
        targetPrice: true,
        analystTargetManual: true,
        accumulationMin: true,
        accumulationMax: true,
        stopPrice: true,
        conviction: true,
        investmentStatus: true,
        updatedAt: true,
      },
    }),
  ]);

  const [latest, previous] = snapshots;
  const latestHoldings = new Map(latest?.holdings.map((h) => [h.securityId, h]));
  const previousHoldings = new Map(previous?.holdings.map((h) => [h.securityId, h]));
  const researchById = new Map(research.map((r) => [r.securityId, r]));

  const watched = research
    .filter((r) => !latestHoldings.has(r.securityId) && (r.investmentStatus === "WATCH" || r.investmentStatus === "ACCUMULATE"))
    .map((r) => r.securityId);
  const ids = securityId
    ? latestHoldings.has(securityId) || researchById.has(securityId)
      ? [securityId]
      : []
    : [...latestHoldings.keys(), ...watched];

  const securities = ids.length
    ? await prisma.security.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, ticker: true } })
    : [];

  const liveQuotes = isFinnhubEnabled();
  const quotes = liveQuotes
    ? await fetchQuotes(securities.flatMap((s) => (s.ticker ? [s.ticker] : [])))
    : new Map<string, LiveQuote>();

  const entries: SecuritySignals[] = [];

  for (const security of securities) {
    const held = latestHoldings.get(security.id);
    const quote = security.ticker ? quotes.get(security.ticker) : undefined;
    const notes = researchById.get(security.id);
    const pricing = priceFor(held, previousHoldings.get(security.id), quote, latest?.snapshotDate, previous?.snapshotDate);

    if (!pricing) continue;

    entries.push(
      evaluateSignals({
        securityId: security.id,
        name: security.name,
        ticker: security.ticker,
        ...pricing,
        averageBuyPrice: held ? toNumber(held.averageBuyPrice) : null,
        isHeld: Boolean(held),
        myTarget: toNumberOrNull(notes?.targetPrice ?? null),
        analystTarget: toNumberOrNull(notes?.analystTargetManual ?? null),
        accumulationMin: toNumberOrNull(notes?.accumulationMin ?? null),
        accumulationMax: toNumberOrNull(notes?.accumulationMax ?? null),
        stopPrice: toNumberOrNull(notes?.stopPrice ?? null),
        conviction: notes?.conviction ?? null,
        investmentStatus: notes?.investmentStatus ?? null,
        researchUpdatedAt: notes?.updatedAt.toISOString() ?? null,
      }),
    );
  }

  return {
    entries: entries.sort((a, b) => a.name.localeCompare(b.name)),
    latestSnapshotDate: latest ? toDateString(latest.snapshotDate) : null,
    liveQuotes,
  };
}

type Row = { currentPrice: Prisma.Decimal };

/**
 * A live quote is compared with the latest snapshot; without one, the latest
 * snapshot is compared with the one before it.
 */
function priceFor(
  held: Row | undefined,
  previous: Row | undefined,
  quote: LiveQuote | undefined,
  latestDate: Date | undefined,
  previousDate: Date | undefined,
) {
  if (quote) {
    return {
      price: quote.price,
      priceSource: "live" as const,
      priceDate: quote.asOf.slice(0, 10),
      previousPrice: held ? toNumber(held.currentPrice) : null,
      previousDate: held && latestDate ? toDateString(latestDate) : null,
    };
  }

  if (!held || !latestDate) {
    return null;
  }

  return {
    price: toNumber(held.currentPrice),
    priceSource: "snapshot" as const,
    priceDate: toDateString(latestDate),
    previousPrice: previous ? toNumber(previous.currentPrice) : null,
    previousDate: previous && previousDate ? toDateString(previousDate) : null,
  };
}
