import type { Prisma } from "@/generated/prisma/client";
import type { SecurityType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import type { SecurityListRow } from "@/lib/portfolio/securities/security-list";
import type { ResearchInput } from "@/lib/research/schema";
import type { TagSummary } from "@/lib/tags/schema";
import { listTags } from "@/lib/tags/queries";

const toNumber = (value: Prisma.Decimal) => Number(value.toFixed());
const toDateString = (value: Date) => value.toISOString().slice(0, 10);

const LATEST_FIRST = [{ snapshotDate: "desc" }, { createdAt: "desc" }] satisfies Prisma.PortfolioSnapshotOrderByWithRelationInput[];

/**
 * The Security master is shared, so a profile may only see a security it has
 * held in one of its own snapshots or written research on. This is the
 * ownership check for every security page and action.
 */
const visibleToProfile = (profileId: string) =>
  ({
    OR: [{ holdings: { some: { snapshot: { profileId } } } }, { research: { some: { profileId } } }],
  }) satisfies Prisma.SecurityWhereInput;

export async function findProfileSecurity(profileId: string, securityId: string) {
  return prisma.security.findFirst({
    where: { id: securityId, ...visibleToProfile(profileId) },
    select: { id: true, name: true, country: true },
  });
}

/** The latest snapshot's holdings with the profile's research and tags, or null with no snapshots. */
export async function listSecurityRows(
  profileId: string,
): Promise<{ snapshotDate: string; rows: SecurityListRow[] } | null> {
  const latest = await prisma.portfolioSnapshot.findFirst({
    where: { profileId },
    orderBy: LATEST_FIRST,
    select: {
      snapshotDate: true,
      holdings: {
        select: {
          securityId: true,
          quantity: true,
          investedAmount: true,
          currentValue: true,
          pnlAmount: true,
          pnlPercentage: true,
          weight: true,
          security: { select: { name: true, ticker: true, type: true } },
        },
      },
    },
  });

  if (!latest) {
    return null;
  }

  const securityIds = latest.holdings.map((h) => h.securityId);

  const [research, tagLinks] = await Promise.all([
    prisma.securityResearch.findMany({
      where: { profileId, securityId: { in: securityIds } },
      select: { securityId: true, conviction: true, investmentStatus: true },
    }),
    prisma.securityTag.findMany({
      where: { securityId: { in: securityIds }, tag: { profileId } },
      orderBy: { tag: { name: "asc" } },
      select: { securityId: true, tag: { select: { id: true, name: true } } },
    }),
  ]);

  const researchBySecurity = new Map(research.map((r) => [r.securityId, r]));
  const tagsBySecurity = Map.groupBy(tagLinks, (link) => link.securityId);

  return {
    snapshotDate: toDateString(latest.snapshotDate),
    rows: latest.holdings.map((h) => ({
      securityId: h.securityId,
      name: h.security.name,
      ticker: h.security.ticker,
      type: h.security.type,
      quantity: toNumber(h.quantity),
      investedAmount: toNumber(h.investedAmount),
      currentValue: toNumber(h.currentValue),
      pnlAmount: toNumber(h.pnlAmount),
      pnlPercentage: toNumber(h.pnlPercentage),
      weight: toNumber(h.weight),
      conviction: researchBySecurity.get(h.securityId)?.conviction ?? null,
      investmentStatus: researchBySecurity.get(h.securityId)?.investmentStatus ?? null,
      tags: (tagsBySecurity.get(h.securityId) ?? []).map((link) => link.tag),
    })),
  };
}

export type SecurityHistoryRow = {
  snapshotId: string;
  snapshotDate: string;
  quantity: number;
  averageBuyPrice: number;
  currentPrice: number;
  investedAmount: number;
  currentValue: number;
  pnlAmount: number;
  pnlPercentage: number;
  weight: number;
};

export type SecurityResearchView = ResearchInput & { updatedAt: Date };

export type SecurityDetail = {
  security: {
    id: string;
    name: string;
    ticker: string | null;
    type: SecurityType;
    tickertapeTicker: string | null;
    sector: string | null;
    industry: string | null;
    /** Every name this security has appeared under in a CSV. */
    sourceNames: string[];
  };
  /** Oldest first, one row per snapshot that held the security. */
  history: SecurityHistoryRow[];
  latestSnapshotDate: string | null;
  /** The latest snapshot's row, or null when the security is no longer held. */
  position: SecurityHistoryRow | null;
  research: SecurityResearchView | null;
  tags: TagSummary[];
  availableTags: TagSummary[];
};

const decimalOrNull = (value: Prisma.Decimal | null) => (value === null ? null : value.toFixed());

export async function getSecurityDetail(profileId: string, securityId: string): Promise<SecurityDetail | null> {
  const security = await prisma.security.findFirst({
    where: { id: securityId, ...visibleToProfile(profileId) },
    select: {
      id: true,
      name: true,
      ticker: true,
      type: true,
      tickertapeTicker: true,
      sector: true,
      industry: true,
      aliases: { orderBy: { createdAt: "asc" }, select: { sourceName: true } },
    },
  });

  if (!security) {
    return null;
  }

  const [holdings, latestSnapshot, research, tags, availableTags] = await Promise.all([
    prisma.snapshotHolding.findMany({
      where: { securityId, snapshot: { profileId } },
      orderBy: [{ snapshot: { snapshotDate: "asc" } }, { snapshot: { createdAt: "asc" } }],
      select: {
        quantity: true,
        averageBuyPrice: true,
        currentPrice: true,
        investedAmount: true,
        currentValue: true,
        pnlAmount: true,
        pnlPercentage: true,
        weight: true,
        snapshot: { select: { id: true, snapshotDate: true } },
      },
    }),
    prisma.portfolioSnapshot.findFirst({
      where: { profileId },
      orderBy: LATEST_FIRST,
      select: { id: true, snapshotDate: true },
    }),
    prisma.securityResearch.findUnique({
      where: { profileId_securityId: { profileId, securityId } },
      omit: { id: true, profileId: true, securityId: true, createdAt: true },
    }),
    prisma.tag.findMany({
      where: { profileId, securities: { some: { securityId } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    listTags(profileId),
  ]);

  const history = holdings.map((h) => ({
    snapshotId: h.snapshot.id,
    snapshotDate: toDateString(h.snapshot.snapshotDate),
    quantity: toNumber(h.quantity),
    averageBuyPrice: toNumber(h.averageBuyPrice),
    currentPrice: toNumber(h.currentPrice),
    investedAmount: toNumber(h.investedAmount),
    currentValue: toNumber(h.currentValue),
    pnlAmount: toNumber(h.pnlAmount),
    pnlPercentage: toNumber(h.pnlPercentage),
    weight: toNumber(h.weight),
  }));

  const latestRow = history.at(-1);
  const { aliases, ...facts } = security;

  return {
    security: { ...facts, sourceNames: aliases.map((alias) => alias.sourceName) },
    history,
    latestSnapshotDate: latestSnapshot ? toDateString(latestSnapshot.snapshotDate) : null,
    position: latestRow && latestRow.snapshotId === latestSnapshot?.id ? latestRow : null,
    research: research
      ? {
          ...research,
          targetPrice: decimalOrNull(research.targetPrice),
          accumulationMin: decimalOrNull(research.accumulationMin),
          accumulationMax: decimalOrNull(research.accumulationMax),
          stopPrice: decimalOrNull(research.stopPrice),
        }
      : null,
    tags,
    availableTags,
  };
}

export type UnmappedSecurity = {
  id: string;
  name: string;
  type: SecurityType;
  tickertapeTicker: string | null;
  sector: string | null;
  industry: string | null;
  /** Whether it is in the profile's latest snapshot, as opposed to sold. */
  isHeld: boolean;
};

/** Securities this profile has held that still have no ticker, currently held first. */
export async function listUnmappedSecurities(profileId: string): Promise<UnmappedSecurity[]> {
  const [securities, latestSnapshot] = await Promise.all([
    prisma.security.findMany({
      where: { ticker: null, holdings: { some: { snapshot: { profileId } } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true, tickertapeTicker: true, sector: true, industry: true },
    }),
    prisma.portfolioSnapshot.findFirst({
      where: { profileId },
      orderBy: LATEST_FIRST,
      select: { holdings: { select: { securityId: true } } },
    }),
  ]);

  const held = new Set(latestSnapshot?.holdings.map((h) => h.securityId));

  return securities
    .map((security) => ({ ...security, isHeld: held.has(security.id) }))
    .sort((a, b) => Number(b.isHeld) - Number(a.isHeld));
}
