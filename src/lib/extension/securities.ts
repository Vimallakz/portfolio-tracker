import type { Conviction, InvestmentStatus } from "@/generated/prisma/enums";
import type { ExtensionSecurity } from "@/lib/extension/contract";
import type { SecuritySignals } from "@/lib/portfolio/signals/signals";
import { CONVICTION_LABEL, INVESTMENT_STATUS_LABEL } from "@/lib/research/labels";

export type SecurityRef = { id: string; name: string; ticker: string | null; tickertapeTicker: string | null };

/** Research levels as numbers, for securities the signals did not price. */
export type ResearchLevels = {
  myTarget: number | null;
  analystTarget: number | null;
  accumulationMin: number | null;
  accumulationMax: number | null;
  stopPrice: number | null;
  conviction: Conviction | null;
  investmentStatus: InvestmentStatus | null;
};

/** Tickertape's slug for a security, uppercased so page links match whatever their case. */
export function tickertapeSlug(security: Pick<SecurityRef, "ticker" | "tickertapeTicker">): string | null {
  const slug = (security.tickertapeTicker ?? security.ticker)?.trim();
  return slug ? slug.toUpperCase() : null;
}

/**
 * One security for the extension. Priced entries come from the signals, so the
 * numbers match the app; research-only ones carry their levels without a price.
 */
export function toExtensionSecurity(
  security: SecurityRef,
  entry: SecuritySignals | null,
  research: ResearchLevels | null,
  appOrigin: string,
): ExtensionSecurity | null {
  const slug = tickertapeSlug(security);

  if (!slug) {
    return null;
  }

  const levels = entry ?? research;
  const price = entry?.price ?? null;
  const status = levels?.investmentStatus ?? null;
  const conviction = levels?.conviction ?? null;
  const accumulationMin = levels?.accumulationMin ?? null;
  const accumulationMax = levels?.accumulationMax ?? null;
  const stopPrice = levels?.stopPrice ?? null;
  const hasZone = accumulationMin !== null || accumulationMax !== null;

  return {
    securityId: security.id,
    slug,
    ticker: security.ticker,
    name: security.name,
    isHeld: entry?.isHeld ?? false,
    status,
    statusLabel: status ? INVESTMENT_STATUS_LABEL[status] : null,
    conviction,
    convictionLabel: conviction ? CONVICTION_LABEL[conviction] : null,
    price,
    priceSource: entry?.priceSource ?? null,
    priceDate: entry?.priceDate ?? null,
    averageBuyPrice: entry?.averageBuyPrice ?? null,
    myTarget: levels?.myTarget ?? null,
    myUpside: entry?.myUpside ?? null,
    analystTarget: levels?.analystTarget ?? null,
    analystUpside: entry?.analystUpside ?? null,
    accumulationMin,
    accumulationMax,
    inZone:
      price !== null &&
      hasZone &&
      (accumulationMin === null || price >= accumulationMin) &&
      (accumulationMax === null || price <= accumulationMax),
    stopPrice,
    stopHit: price !== null && stopPrice !== null && price <= stopPrice,
    signals: (entry?.signals ?? []).map((signal) => ({ title: signal.title, tone: signal.tone })),
    url: `${appOrigin}/securities/${security.id}`,
  };
}
