/**
 * Development seed data. Creates the local account and the two profiles from
 * the specification so the app shell has something real to render.
 *
 * Safe to re-run: every write is an upsert keyed on a natural unique column.
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const LOCAL_USER_EMAIL = "local@portfolio.local";
const PROFILE_NAMES = ["Vimal", "Wife"] as const;

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const user = await prisma.user.upsert({
      where: { email: LOCAL_USER_EMAIL },
      update: {},
      create: { email: LOCAL_USER_EMAIL, name: "Local User" },
    });

    for (const name of PROFILE_NAMES) {
      await prisma.profile.upsert({
        where: { userId_name: { userId: user.id, name } },
        update: {},
        create: { userId: user.id, name },
      });
    }

    const profiles = await prisma.profile.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { name: true },
    });

    console.log(
      `Seeded ${profiles.length} profiles: ${profiles.map((p) => p.name).join(", ")}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
