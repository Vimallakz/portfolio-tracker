import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/db/prisma";

const TOKEN_DAYS = 90;
const TOKEN_PREFIX = "pit_ext_";
/** Writing lastUsedAt on every call is wasteful; once an hour is enough for Settings. */
const LAST_USED_WRITE_MS = 60 * 60 * 1000;

export const hashApiToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** The token from an `Authorization: Bearer …` header, or null. Exported for tests. */
export function readBearerToken(header: string | null): string | null {
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  const token = match?.[1];

  return token?.startsWith(TOKEN_PREFIX) ? token : null;
}

export type TokenUser = { tokenId: string; userId: string };

/** Creates a token for the extension. The plain token is returned once and never stored. */
export async function createApiToken(userId: string, name: string): Promise<{ token: string; expiresAt: Date }> {
  const token = `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  const expiresAt = new Date(Date.now() + TOKEN_DAYS * 24 * 60 * 60 * 1000);

  await prisma.apiToken.create({ data: { userId, name, tokenHash: hashApiToken(token), expiresAt } });

  return { token, expiresAt };
}

/** The user behind a request's Bearer token, or null for a missing, unknown, revoked or expired one. */
export async function getTokenUser(request: Request): Promise<TokenUser | null> {
  const token = readBearerToken(request.headers.get("authorization"));

  if (!token) {
    return null;
  }

  const record = await prisma.apiToken.findUnique({
    where: { tokenHash: hashApiToken(token) },
    select: { id: true, userId: true, expiresAt: true, lastUsedAt: true },
  });
  const now = new Date();

  if (!record || record.expiresAt <= now) {
    return null;
  }

  if (!record.lastUsedAt || now.getTime() - record.lastUsedAt.getTime() > LAST_USED_WRITE_MS) {
    await prisma.apiToken.update({ where: { id: record.id }, data: { lastUsedAt: now } });
  }

  return { tokenId: record.id, userId: record.userId };
}

/** Scoped to the owner, so one user can never revoke another's device. */
export async function revokeApiToken(userId: string, tokenId: string): Promise<boolean> {
  const { count } = await prisma.apiToken.deleteMany({ where: { id: tokenId, userId } });
  return count > 0;
}

export type ApiTokenSummary = { id: string; name: string; lastUsedAt: Date | null; expiresAt: Date; createdAt: Date };

export async function listApiTokens(userId: string): Promise<ApiTokenSummary[]> {
  return prisma.apiToken.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, lastUsedAt: true, expiresAt: true, createdAt: true },
  });
}
