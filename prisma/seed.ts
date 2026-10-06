/**
 * Development seed data. Creates the local account, the two profiles from the
 * specification, a small security master, and a few monthly snapshots per
 * profile so the dashboard and history pages are visually testable.
 *
 * Safe to re-run: reference data is upserted on natural unique keys, and a
 * profile's seed snapshots are created only if that profile has none yet.
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import {
  Conviction,
  InvestmentStatus,
  Prisma,
  PrismaClient,
  SecurityType,
} from "../src/generated/prisma/client";
import { normalizeSecurityName } from "../src/lib/portfolio/securities/security-name";

const { Decimal } = Prisma;

const LOCAL_USER_EMAIL = "local@portfolio.local";
const PROFILE_NAMES = ["Vimal", "Wife"] as const;
type ProfileName = (typeof PROFILE_NAMES)[number];

type SeedSecurity = {
  ticker: string;
  name: string;
  type: SecurityType;
  sector?: string;
  industry?: string;
};

const SECURITIES: SeedSecurity[] = [
  { ticker: "GRAB", name: "Grab Holdings", type: SecurityType.STOCK, sector: "Technology", industry: "Software—Application" },
  { ticker: "NVDA", name: "NVIDIA Corp", type: SecurityType.STOCK, sector: "Technology", industry: "Semiconductors" },
  { ticker: "ANY", name: "Sphere 3D Corp", type: SecurityType.STOCK, sector: "Technology", industry: "Software—Infrastructure" },
  { ticker: "VOO", name: "Vanguard S&P 500 ETF", type: SecurityType.ETF },
  { ticker: "QQQ", name: "Invesco QQQ Trust", type: SecurityType.ETF },
  { ticker: "SCHD", name: "Schwab US Dividend Equity ETF", type: SecurityType.ETF },
];

/** [ticker, quantity, averageBuyPrice, currentPrice] */
type SeedRow = [string, number, number, number];

type SeedSnapshot = { date: string; rows: SeedRow[] };

const SNAPSHOTS: Record<ProfileName, SeedSnapshot[]> = {
  Vimal: [
    {
      date: "2026-08-31",
      rows: [
        ["GRAB", 100, 5.0, 5.6],
        ["VOO", 5, 480, 500],
        ["NVDA", 10, 120, 150],
        ["ANY", 200, 1.5, 1.2],
      ],
    },
    {
      date: "2026-09-30",
      rows: [
        ["GRAB", 120, 5.1, 5.9],
        ["VOO", 6, 484, 510],
        ["NVDA", 10, 120, 165],
        ["ANY", 200, 1.5, 1.05],
      ],
    },
    {
      date: "2026-10-05",
      rows: [
        ["GRAB", 120, 5.1, 6.2],
        ["VOO", 7, 489, 520],
        ["NVDA", 8, 120, 180],
        ["QQQ", 3, 560, 575],
      ],
    },
  ],
  Wife: [
    {
      date: "2026-09-30",
      rows: [
        ["VOO", 4, 490, 510],
        ["NVDA", 5, 130, 165],
      ],
    },
    {
      date: "2026-10-05",
      rows: [
        ["VOO", 5, 494, 520],
        ["NVDA", 5, 130, 180],
        ["SCHD", 20, 27, 28],
      ],
    },
  ],
};

const TAGS: Record<ProfileName, Record<string, string[]>> = {
  Vimal: { Growth: ["GRAB", "NVDA"], Fintech: ["GRAB"], AI: ["NVDA"], Core: ["VOO"], Speculative: ["ANY"] },
  Wife: { Core: ["VOO"], Dividend: ["SCHD"], AI: ["NVDA"] },
};

type SeedResearch = Omit<
  Prisma.SecurityResearchUncheckedCreateInput,
  "profileId" | "securityId"
>;

const RESEARCH: Record<ProfileName, Record<string, SeedResearch>> = {
  Vimal: {
    GRAB: {
      thesis: "Southeast Asia's leading super-app reaching sustained profitability.",
      whyBought: "Ride-hailing and delivery leadership with a growing fintech arm.",
      bullCase: "Fintech lending scales and margins expand across the region.",
      bearCase: "Competition and regulation compress take rates.",
      targetPrice: new Decimal(8),
      accumulationMin: new Decimal(4.5),
      accumulationMax: new Decimal(5.0),
      stopPrice: new Decimal(3.8),
      expectedHoldingPeriod: "3–5 years",
      conviction: Conviction.HIGH,
      investmentStatus: InvestmentStatus.HOLD,
    },
    NVDA: {
      thesis: "Dominant AI accelerator platform with a software moat in CUDA.",
      targetPrice: new Decimal(200),
      stopPrice: new Decimal(130),
      conviction: Conviction.VERY_HIGH,
      investmentStatus: InvestmentStatus.HOLD,
    },
    VOO: {
      thesis: "Low-cost core exposure to the S&P 500.",
      conviction: Conviction.VERY_HIGH,
      investmentStatus: InvestmentStatus.ACCUMULATE,
    },
  },
  Wife: {
    VOO: {
      thesis: "Long-term core holding.",
      conviction: Conviction.HIGH,
      investmentStatus: InvestmentStatus.ACCUMULATE,
    },
  },
};

const percent = (part: Prisma.Decimal, whole: Prisma.Decimal) =>
  whole.isZero() ? new Decimal(0) : part.div(whole).mul(100).toDecimalPlaces(4);

function buildHoldings(rows: SeedRow[], securityIds: Map<string, string>, names: Map<string, string>) {
  const computed = rows.map(([ticker, qty, avg, price]) => {
    const quantity = new Decimal(qty);
    const averageBuyPrice = new Decimal(avg);
    const currentPrice = new Decimal(price);
    const investedAmount = quantity.mul(averageBuyPrice);
    const currentValue = quantity.mul(currentPrice);
    const pnlAmount = currentValue.sub(investedAmount);

    return {
      securityId: securityIds.get(ticker)!,
      sourceName: names.get(ticker)!,
      quantity,
      averageBuyPrice,
      investedAmount,
      currentPrice,
      currentValue,
      pnlAmount,
      pnlPercentage: percent(pnlAmount, investedAmount),
    };
  });

  const totalValue = computed.reduce((sum, h) => sum.add(h.currentValue), new Decimal(0));

  return computed.map((h) => ({ ...h, weight: percent(h.currentValue, totalValue) }));
}

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

    const securityIds = new Map<string, string>();
    const securityNames = new Map<string, string>();

    for (const { ticker, name, type, sector, industry } of SECURITIES) {
      const security = await prisma.security.upsert({
        where: { country_ticker: { country: "US", ticker } },
        update: {},
        create: { ticker, name, type, sector, industry },
      });

      await prisma.securityAlias.upsert({
        where: { normalizedName: normalizeSecurityName(name) },
        update: {},
        create: {
          securityId: security.id,
          sourceName: name,
          normalizedName: normalizeSecurityName(name),
        },
      });

      securityIds.set(ticker, security.id);
      securityNames.set(ticker, name);
    }

    for (const profileName of PROFILE_NAMES) {
      const profile = await prisma.profile.upsert({
        where: { userId_name: { userId: user.id, name: profileName } },
        update: {},
        create: { userId: user.id, name: profileName },
      });

      const existingSnapshots = await prisma.portfolioSnapshot.count({
        where: { profileId: profile.id },
      });

      if (existingSnapshots === 0) {
        for (const { date, rows } of SNAPSHOTS[profileName]) {
          await prisma.portfolioSnapshot.create({
            data: {
              profileId: profile.id,
              snapshotDate: new Date(`${date}T00:00:00Z`),
              fileName: `seed-${date}.csv`,
              holdings: { create: buildHoldings(rows, securityIds, securityNames) },
            },
          });
        }
      }

      for (const [tagName, tickers] of Object.entries(TAGS[profileName])) {
        const tag = await prisma.tag.upsert({
          where: { profileId_name: { profileId: profile.id, name: tagName } },
          update: {},
          create: { profileId: profile.id, name: tagName },
        });

        await prisma.securityTag.createMany({
          data: tickers.map((ticker) => ({ securityId: securityIds.get(ticker)!, tagId: tag.id })),
          skipDuplicates: true,
        });
      }

      for (const [ticker, research] of Object.entries(RESEARCH[profileName])) {
        const securityId = securityIds.get(ticker)!;

        await prisma.securityResearch.upsert({
          where: { profileId_securityId: { profileId: profile.id, securityId } },
          update: {},
          create: { ...research, profileId: profile.id, securityId },
        });
      }
    }

    const [profiles, securities, snapshots, holdings] = await Promise.all([
      prisma.profile.count({ where: { userId: user.id } }),
      prisma.security.count(),
      prisma.portfolioSnapshot.count(),
      prisma.snapshotHolding.count(),
    ]);

    console.log(
      `Seeded ${profiles} profiles, ${securities} securities, ${snapshots} snapshots, ${holdings} holdings.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
