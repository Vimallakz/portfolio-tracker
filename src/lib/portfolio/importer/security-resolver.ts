import type { Prisma } from "@/generated/prisma/client";
import type { SecurityType } from "@/generated/prisma/enums";

export type ResolvedSecurity = {
  id: string;
  name: string;
  ticker: string | null;
  type: SecurityType;
};

/**
 * Looks up remembered CSV-name → Security mappings. Names with no alias are
 * simply absent from the result; the caller decides whether to create them.
 */
export async function resolveSecurities(
  db: Prisma.TransactionClient,
  normalizedNames: string[],
): Promise<Map<string, ResolvedSecurity>> {
  if (normalizedNames.length === 0) {
    return new Map();
  }

  const aliases = await db.securityAlias.findMany({
    where: { normalizedName: { in: normalizedNames } },
    select: {
      normalizedName: true,
      security: { select: { id: true, name: true, ticker: true, type: true } },
    },
  });

  return new Map(aliases.map((alias) => [alias.normalizedName, alias.security]));
}
