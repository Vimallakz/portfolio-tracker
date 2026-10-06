import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import type { UsdInrRate } from "@/lib/currency/currency";

/** European Central Bank reference rates via Frankfurter. Free, no API key, updated each working day. */
const MARKET_RATE_URL = "https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR";
const REVALIDATE_SECONDS = 60 * 60 * 6;
const TIMEOUT_MS = 5000;

const responseSchema = z.object({
  date: z.iso.date(),
  rates: z.object({ INR: z.number().positive() }),
});

/** The latest market rate, or null when the service is unreachable or returns something unexpected. */
export async function fetchMarketRate(): Promise<UsdInrRate | null> {
  try {
    const response = await fetch(MARKET_RATE_URL, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      return null;
    }

    const parsed = responseSchema.safeParse(await response.json());

    return parsed.success ? { rate: parsed.data.rates.INR, date: parsed.data.date, source: "MARKET" } : null;
  } catch {
    return null;
  }
}

export async function getRateOverride(userId: string): Promise<number | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { usdInrRateOverride: true } });

  return user?.usdInrRateOverride ? user.usdInrRateOverride.toNumber() : null;
}

/** The rate used across the app: the user's override when set, otherwise the market rate. */
export async function getUsdInrRate(userId: string): Promise<UsdInrRate | null> {
  const override = await getRateOverride(userId);

  return override !== null ? { rate: override, date: null, source: "MANUAL" } : fetchMarketRate();
}
