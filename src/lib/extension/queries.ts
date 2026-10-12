import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { ExtensionSecurity } from "@/lib/extension/contract";
import { toExtensionSecurity, type ResearchLevels } from "@/lib/extension/securities";
import { listProfileSignals } from "@/lib/portfolio/signals/queries";

const toNumber = (value: Prisma.Decimal | null) => (value === null ? null : Number(value.toFixed()));

/**
 * Every security the profile holds or has researched. The caller must have
 * checked that the profile belongs to the requesting user.
 */
export async function listExtensionSecurities(profileId: string, appOrigin: string): Promise<ExtensionSecurity[]> {
  const [signals, research] = await Promise.all([
    listProfileSignals(profileId),
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
      },
    }),
  ]);

  const entries = new Map(signals.entries.map((entry) => [entry.securityId, entry]));
  const levels = new Map<string, ResearchLevels>(
    research.map((r) => [
      r.securityId,
      {
        myTarget: toNumber(r.targetPrice),
        analystTarget: toNumber(r.analystTargetManual),
        accumulationMin: toNumber(r.accumulationMin),
        accumulationMax: toNumber(r.accumulationMax),
        stopPrice: toNumber(r.stopPrice),
        conviction: r.conviction,
        investmentStatus: r.investmentStatus,
      },
    ]),
  );
  const ids = [...new Set([...entries.keys(), ...levels.keys()])];

  const securities = await prisma.security.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, ticker: true, tickertapeTicker: true },
  });

  return securities
    .map((security) =>
      toExtensionSecurity(security, entries.get(security.id) ?? null, levels.get(security.id) ?? null, appOrigin),
    )
    .filter((security): security is ExtensionSecurity => security !== null)
    .sort((a, b) => a.slug.localeCompare(b.slug));
}
