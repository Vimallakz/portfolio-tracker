/**
 * Turns the pre-login local account into a real one, keeping its id so every
 * profile, snapshot and note stays attached.
 *
 *   npx tsx scripts/claim-account.ts <email> <password>
 */
import "dotenv/config";

import { hashPassword } from "@/lib/auth/password";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/schema";
import { prisma } from "@/lib/db/prisma";

const LOCAL_USER_EMAIL = "local@portfolio.local";

async function main() {
  const [rawEmail, password] = process.argv.slice(2);
  const email = rawEmail?.trim().toLowerCase();

  if (!email || !password) {
    throw new Error("Usage: npx tsx scripts/claim-account.ts <email> <password>");
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }

  const local = await prisma.user.findUnique({ where: { email: LOCAL_USER_EMAIL }, select: { id: true } });
  if (!local) {
    throw new Error(`No ${LOCAL_USER_EMAIL} account found. It may already have been claimed.`);
  }

  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new Error(`${email} already has an account.`);
  }

  await prisma.user.update({
    where: { id: local.id },
    data: { email, name: null, passwordHash: await hashPassword(password) },
  });

  const profiles = await prisma.profile.count({ where: { userId: local.id } });
  console.log(`Claimed: ${email} now owns ${profiles} profile(s).`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
