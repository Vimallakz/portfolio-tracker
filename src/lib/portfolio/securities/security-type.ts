import type { SecurityType } from "@/generated/prisma/enums";

const ETF_PATTERN = /\b(etfs?|exchange traded fund|index fund)\b/i;

/**
 * Best guess for a security first seen in a CSV, which does not carry a type.
 * The user can correct it when adding the ticker.
 */
export function guessSecurityType(name: string): SecurityType {
  return ETF_PATTERN.test(name) ? "ETF" : "STOCK";
}
