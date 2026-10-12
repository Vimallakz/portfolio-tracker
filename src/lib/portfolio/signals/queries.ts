import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { fetchQuotes, isFinnhubEnabled, type LiveQuote } from "@/lib/market-data/finnhub";
import { fetchSplits, type StockSplit } from "@/lib/market-data/yahoo";
import { evaluateSignals, type SecuritySignals } from "@/lib/portfolio/signals/signals";
import { adjustForSplit, splitBetween } from "@/lib/portfolio/signals/splits";

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

  const tickers = securities.flatMap((s) => (s.ticker ? [s.ticker] : []));
  const liveQuotes = isFinnhubEnabled();
  const [quotes, splits] = await Promise.all([
    liveQuotes ? fetchQuotes(tickers) : new Map<string, LiveQuote>(),
    fetchSplitsFor(tickers),
  ]);

  const entries: SecuritySignals[] = [];

  for (const security of securities) {
    const held = latestHoldings.get(security.id);
    const quote = security.ticker ? quotes.get(security.ticker) : undefined;
    const notes = researchById.get(security.id);
    const pricing = priceFor(
      held,
      previousHoldings.get(security.id),
      quote,
      latest?.snapshotDate,
      previous?.snapshotDate,
      (security.ticker && splits.get(security.ticker)) || [],
    );

    if (!pricing) continue;

    // Research prices entered before a split are in old-share dollars too.
    const researchSplit = notes
      ? splitBetween((security.ticker && splits.get(security.ticker)) || [], toDateString(notes.updatedAt), pricing.priceDate)
      : null;
    const researchPrice = (value: Prisma.Decimal | null | undefined) => adjustForSplit(toNumberOrNull(value ?? null), researchSplit);

    entries.push(
      evaluateSignals({
        securityId: security.id,
        name: security.name,
        ticker: security.ticker,
        ...pricing,
        isHeld: Boolean(held),
        myTarget: researchPrice(notes?.targetPrice),
        analystTarget: researchPrice(notes?.analystTargetManual),
        accumulationMin: researchPrice(notes?.accumulationMin),
        accumulationMax: researchPrice(notes?.accumulationMax),
        stopPrice: researchPrice(notes?.stopPrice),
        conviction: notes?.conviction ?? null,
        investmentStatus: notes?.investmentStatus ?? null,
        researchUpdatedAt: notes?.updatedAt.toISOString() ?? null,
        split: pricing.split ?? researchSplit,
      }),
    );
  }

  return {
    entries: entries.sort((a, b) => a.name.localeCompare(b.name)),
    latestSnapshotDate: latest ? toDateString(latest.snapshotDate) : null,
    liveQuotes,
  };
}

async function fetchSplitsFor(tickers: string[]): Promise<Map<string, StockSplit[]>> {
  const unique = [...new Set(tickers)];
  const splits = await Promise.all(unique.map(async (ticker) => [ticker, await fetchSplits(ticker)] as const));
  return new Map(splits);
}

type Row = { currentPrice: Prisma.Decimal; averageBuyPrice: Prisma.Decimal };

/**
 * A live quote is compared with the latest snapshot; without one, the latest
 * snapshot is compared with the one before it. Older prices are adjusted for
 * any split in between, so a 3-for-1 split does not read as a 67% fall.
 */
function priceFor(
  held: Row | undefined,
  previous: Row | undefined,
  quote: LiveQuote | undefined,
  latestDate: Date | undefined,
  previousDate: Date | undefined,
  splits: StockSplit[],
) {
  if (quote) {
    const priceDate = quote.asOf.slice(0, 10);
    const split = held && latestDate ? splitBetween(splits, toDateString(latestDate), priceDate) : null;

    return {
      price: quote.price,
      priceSource: "live" as const,
      priceDate,
      previousPrice: held ? adjustForSplit(toNumber(held.currentPrice), split) : null,
      previousDate: held && latestDate ? toDateString(latestDate) : null,
      averageBuyPrice: held ? adjustForSplit(toNumber(held.averageBuyPrice), split) : null,
      split,
    };
  }

  if (!held || !latestDate) {
    return null;
  }

  const priceDate = toDateString(latestDate);
  const split = previous && previousDate ? splitBetween(splits, toDateString(previousDate), priceDate) : null;

  return {
    price: toNumber(held.currentPrice),
    priceSource: "snapshot" as const,
    priceDate,
    previousPrice: previous ? adjustForSplit(toNumber(previous.currentPrice), split) : null,
    previousDate: previous && previousDate ? toDateString(previousDate) : null,
    averageBuyPrice: toNumber(held.averageBuyPrice),
    split,
  };
}
