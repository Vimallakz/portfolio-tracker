import { prisma } from "@/lib/db/prisma";
import { fetchDailyCloses } from "@/lib/market-data/yahoo";
import { BENCHMARKS, type BenchmarkSymbol, type PricePoint } from "@/lib/portfolio/benchmark/benchmark";

/** Snapshots are monthly, so prices twice a day are plenty. */
const STALE_AFTER_MS = 12 * 60 * 60 * 1000;
/** After a failed download, stop asking for a while instead of slowing every page. */
const BACKOFF_MS = 30 * 60 * 1000;
/** Before the first month starts, far enough to reach the previous month's last close over weekends and holidays. */
const LOOKBACK_DAYS = 10;

const unavailableUntil = new Map<BenchmarkSymbol, number>();

const toDbDate = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`);
const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

function daysBefore(isoDate: string, days: number): string {
  const date = toDbDate(isoDate);
  date.setUTCDate(date.getUTCDate() - days);
  return toIsoDate(date);
}

async function refreshIfStale(symbol: BenchmarkSymbol, neededFrom: string) {
  const sync = await prisma.benchmarkSync.findUnique({ where: { symbol } });
  const syncedFrom = sync ? toIsoDate(sync.fromDate) : null;
  const covers = syncedFrom !== null && syncedFrom <= neededFrom;
  const fresh = sync !== null && Date.now() - sync.fetchedAt.getTime() < STALE_AFTER_MS;

  if ((covers && fresh) || Date.now() < (unavailableUntil.get(symbol) ?? 0)) {
    return;
  }

  const fromDate = syncedFrom !== null && syncedFrom < neededFrom ? syncedFrom : neededFrom;
  const closes = await fetchDailyCloses(symbol, fromDate);

  if (!closes) {
    unavailableUntil.set(symbol, Date.now() + BACKOFF_MS);
    return;
  }

  await prisma.$transaction([
    prisma.benchmarkPrice.deleteMany({ where: { symbol } }),
    prisma.benchmarkPrice.createMany({
      data: closes.map((close) => ({ symbol, date: toDbDate(close.date), close: close.close })),
      skipDuplicates: true,
    }),
    prisma.benchmarkSync.upsert({
      where: { symbol },
      create: { symbol, fromDate: toDbDate(fromDate), fetchedAt: new Date() },
      update: { fromDate: toDbDate(fromDate), fetchedAt: new Date() },
    }),
  ]);
}

/**
 * Daily adjusted closes for every benchmark, from the last close of the month
 * before `firstDate` ("YYYY-MM-DD"). Served from the database, which is
 * refreshed from Yahoo Finance when half a day old. Never throws: a symbol
 * that cannot be loaded is left out, and callers show the comparison without it.
 */
export async function getBenchmarkPrices(firstDate: string): Promise<Map<BenchmarkSymbol, PricePoint[]>> {
  const neededFrom = daysBefore(`${firstDate.slice(0, 7)}-01`, LOOKBACK_DAYS);
  const prices = new Map<BenchmarkSymbol, PricePoint[]>();

  await Promise.all(
    BENCHMARKS.map(async ({ symbol }) => {
      try {
        await refreshIfStale(symbol, neededFrom);

        const rows = await prisma.benchmarkPrice.findMany({
          where: { symbol, date: { gte: toDbDate(neededFrom) } },
          orderBy: { date: "asc" },
        });

        if (rows.length > 0) {
          prices.set(
            symbol,
            rows.map((row) => ({ date: toIsoDate(row.date), close: row.close.toNumber() })),
          );
        }
      } catch {
        unavailableUntil.set(symbol, Date.now() + BACKOFF_MS);
      }
    }),
  );

  return prices;
}
