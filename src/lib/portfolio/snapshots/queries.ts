import { prisma } from "@/lib/db/prisma";
import type { SnapshotRow } from "@/lib/portfolio/analytics/dashboard";

/**
 * Every snapshot for a profile with its holdings, oldest first. A personal
 * portfolio has dozens of holdings and one snapshot a month, so loading the
 * full history is cheaper than a round trip per chart point.
 */
export async function listProfileSnapshots(profileId: string): Promise<SnapshotRow[]> {
  const snapshots = await prisma.portfolioSnapshot.findMany({
    where: { profileId },
    orderBy: [{ snapshotDate: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      snapshotDate: true,
      holdings: {
        select: {
          securityId: true,
          quantity: true,
          averageBuyPrice: true,
          investedAmount: true,
          currentPrice: true,
          currentValue: true,
          weight: true,
          pnlAmount: true,
          pnlPercentage: true,
          security: { select: { name: true, ticker: true, type: true } },
        },
      },
    },
  });

  return snapshots.map((snapshot) => ({
    id: snapshot.id,
    snapshotDate: snapshot.snapshotDate.toISOString().slice(0, 10),
    holdings: snapshot.holdings.map((h) => ({
      securityId: h.securityId,
      name: h.security.name,
      ticker: h.security.ticker,
      type: h.security.type,
      quantity: h.quantity.toFixed(),
      averageBuyPrice: h.averageBuyPrice.toFixed(),
      investedAmount: h.investedAmount.toFixed(),
      currentPrice: h.currentPrice.toFixed(),
      currentValue: h.currentValue.toFixed(),
      weight: h.weight.toFixed(),
      pnlAmount: h.pnlAmount.toFixed(),
      pnlPercentage: h.pnlPercentage.toFixed(),
    })),
  }));
}
