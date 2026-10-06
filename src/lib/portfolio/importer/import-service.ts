import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  calculatePnl,
  calculatePnlPercentage,
  sumDecimals,
} from "@/lib/portfolio/analytics/calculations";
import {
  compareSnapshots,
  type ComparableHolding,
} from "@/lib/portfolio/comparison/snapshot-comparator";
import { hashCsvContent } from "@/lib/portfolio/importer/content-hash";
import { parsePortfolioCsv } from "@/lib/portfolio/importer/import-validator";
import type {
  DuplicateSnapshot,
  ImportConfirmation,
  ImportPreview,
  PortfolioTotals,
  PreviewHolding,
} from "@/lib/portfolio/importer/preview";
import { resolveSecurities } from "@/lib/portfolio/importer/security-resolver";
import type { ParsedHolding } from "@/lib/portfolio/importer/types";
import { guessSecurityType } from "@/lib/portfolio/securities/security-type";

/** A failure whose message is safe and useful to show the user. */
export class ImportError extends Error {}

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const NEW_SECURITY_KEY_PREFIX = "new:";

const decimalString = z.string().regex(/^-?\d+(\.\d+)?$/);

const sessionPayloadSchema = z.object({
  snapshotDate: z.iso.date(),
  derivedFields: z.array(z.string()),
  holdings: z
    .array(
      z.object({
        rowNumber: z.number().int(),
        sourceName: z.string().min(1),
        normalizedName: z.string().min(1),
        quantity: decimalString,
        averageBuyPrice: decimalString,
        investedAmount: decimalString,
        currentPrice: decimalString,
        currentValue: decimalString,
        weight: decimalString,
        pnlAmount: decimalString,
        pnlPercentage: decimalString,
      }),
    )
    .min(1),
});

type SessionPayload = z.infer<typeof sessionPayloadSchema>;

function toDateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function fromDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function calculateTotals(holdings: ParsedHolding[]): PortfolioTotals {
  const investedAmount = sumDecimals(holdings.map((h) => h.investedAmount));
  const currentValue = sumDecimals(holdings.map((h) => h.currentValue));

  return {
    investedAmount: investedAmount.toFixed(),
    currentValue: currentValue.toFixed(),
    pnlAmount: calculatePnl(currentValue, investedAmount).toFixed(),
    pnlPercentage: calculatePnlPercentage(currentValue, investedAmount).toDecimalPlaces(4).toFixed(),
  };
}

/**
 * The snapshot this import should be compared against: the latest one on or
 * before the new snapshot date, so back-filling an older month compares with
 * the month before it rather than with today's portfolio.
 */
async function findPreviousSnapshot(profileId: string, snapshotDate: string) {
  return prisma.portfolioSnapshot.findFirst({
    where: { profileId, snapshotDate: { lte: toDateOnly(snapshotDate) } },
    orderBy: [{ snapshotDate: "desc" }, { createdAt: "desc" }],
    select: {
      snapshotDate: true,
      holdings: {
        select: {
          securityId: true,
          sourceName: true,
          quantity: true,
          averageBuyPrice: true,
          investedAmount: true,
          currentValue: true,
          weight: true,
          pnlAmount: true,
          pnlPercentage: true,
          security: { select: { name: true, ticker: true, type: true } },
        },
      },
    },
  });
}

async function findDuplicate(
  db: Prisma.TransactionClient,
  profileId: string,
  contentHash: string,
  snapshotDate: string,
): Promise<DuplicateSnapshot | null> {
  const sameContent = await db.portfolioSnapshot.findFirst({
    where: { profileId, contentHash },
    orderBy: { createdAt: "desc" },
    select: { id: true, snapshotDate: true },
  });

  if (sameContent) {
    return { snapshotId: sameContent.id, snapshotDate: fromDateOnly(sameContent.snapshotDate), reason: "SAME_CONTENT" };
  }

  const sameDate = await db.portfolioSnapshot.findFirst({
    where: { profileId, snapshotDate: toDateOnly(snapshotDate) },
    orderBy: { createdAt: "desc" },
    select: { id: true, snapshotDate: true },
  });

  return sameDate
    ? { snapshotId: sameDate.id, snapshotDate: fromDateOnly(sameDate.snapshotDate), reason: "SAME_DATE" }
    : null;
}

type PreviewInput = {
  profile: { id: string; name: string };
  fileName: string;
  csvText: string;
  snapshotDate: string;
};

/**
 * Validates and parses the CSV, compares it with the previous snapshot, and
 * parks the parsed result in an ImportSession. Nothing touches snapshots,
 * securities or aliases until confirmImport().
 */
export async function previewImport({
  profile,
  fileName,
  csvText,
  snapshotDate,
}: PreviewInput): Promise<ImportPreview> {
  const parsed = parsePortfolioCsv(csvText);

  if (!parsed.ok) {
    throw new ImportError(parsed.errors.join("\n"));
  }

  const { holdings, derivedFields } = parsed;
  const contentHash = hashCsvContent(csvText);

  const [resolved, previousSnapshot, duplicate] = await Promise.all([
    resolveSecurities(prisma, holdings.map((h) => h.normalizedName)),
    findPreviousSnapshot(profile.id, snapshotDate),
    findDuplicate(prisma, profile.id, contentHash, snapshotDate),
  ]);

  const nextComparable: ComparableHolding[] = holdings.map((h) => {
    const security = resolved.get(h.normalizedName);

    return {
      key: security?.id ?? `${NEW_SECURITY_KEY_PREFIX}${h.normalizedName}`,
      name: security?.name ?? h.sourceName,
      quantity: h.quantity,
      averageBuyPrice: h.averageBuyPrice,
      investedAmount: h.investedAmount,
      currentValue: h.currentValue,
      weight: h.weight,
      pnlAmount: h.pnlAmount,
      pnlPercentage: h.pnlPercentage,
    };
  });

  const previousComparable: ComparableHolding[] | null = previousSnapshot
    ? previousSnapshot.holdings.map((h) => ({
        key: h.securityId,
        name: h.security.name,
        quantity: h.quantity.toFixed(),
        averageBuyPrice: h.averageBuyPrice.toFixed(),
        investedAmount: h.investedAmount.toFixed(),
        currentValue: h.currentValue.toFixed(),
        weight: h.weight.toFixed(),
        pnlAmount: h.pnlAmount.toFixed(),
        pnlPercentage: h.pnlPercentage.toFixed(),
      }))
    : null;

  const comparison = compareSnapshots(previousComparable, nextComparable);

  const securityByKey = new Map<string, Pick<PreviewHolding, "ticker" | "type" | "isNewSecurity">>();

  for (const h of previousSnapshot?.holdings ?? []) {
    securityByKey.set(h.securityId, { ticker: h.security.ticker, type: h.security.type, isNewSecurity: false });
  }

  for (const h of holdings) {
    const security = resolved.get(h.normalizedName);

    securityByKey.set(security?.id ?? `${NEW_SECURITY_KEY_PREFIX}${h.normalizedName}`, {
      ticker: security?.ticker ?? null,
      type: security?.type ?? guessSecurityType(h.sourceName),
      isNewSecurity: !security,
    });
  }

  const previewHoldings: PreviewHolding[] = comparison.holdings.map((h) => ({
    ...h,
    ...securityByKey.get(h.key)!,
  }));

  const payload: SessionPayload = { snapshotDate, derivedFields, holdings };

  const session = await prisma.$transaction(async (tx) => {
    // Only the latest preview per profile is confirmable.
    await tx.importSession.updateMany({
      where: { profileId: profile.id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });

    return tx.importSession.create({
      data: {
        profileId: profile.id,
        fileName,
        contentHash,
        rowCount: holdings.length,
        payload,
      },
      select: { id: true },
    });
  });

  const currentHoldings = previewHoldings.filter((h) => h.status !== "REMOVED");

  return {
    sessionId: session.id,
    profileName: profile.name,
    fileName,
    snapshotDate,
    previousSnapshotDate: previousSnapshot ? fromDateOnly(previousSnapshot.snapshotDate) : null,
    summary: {
      ...comparison.summary,
      newSecurities: currentHoldings.filter((h) => h.isNewSecurity).length,
      withoutTicker: currentHoldings.filter((h) => !h.ticker).length,
    },
    totals: calculateTotals(holdings),
    holdings: previewHoldings,
    duplicate,
    derivedFields,
  };
}

type ConfirmInput = {
  profileId: string;
  sessionId: string;
  allowDuplicate: boolean;
};

/**
 * Turns a previewed session into an immutable snapshot. Runs in one
 * transaction: if anything fails, no snapshot, security or alias is written.
 */
export async function confirmImport({
  profileId,
  sessionId,
  allowDuplicate,
}: ConfirmInput): Promise<ImportConfirmation> {
  return prisma.$transaction(
    async (tx) => {
      const session = await tx.importSession.findFirst({
        where: { id: sessionId, profileId },
        select: { status: true, contentHash: true, fileName: true, payload: true, createdAt: true },
      });

      if (!session) {
        throw new ImportError("This import could not be found. Upload the file again.");
      }

      if (session.status !== "PENDING") {
        throw new ImportError(
          session.status === "CONFIRMED"
            ? "This import has already been confirmed."
            : "This preview is no longer active. Upload the file again.",
        );
      }

      if (Date.now() - session.createdAt.getTime() > SESSION_TTL_MS) {
        throw new ImportError("This preview has expired. Upload the file again.");
      }

      // Claiming the session first means a double-click cannot import twice.
      const claimed = await tx.importSession.updateMany({
        where: { id: sessionId, profileId, status: "PENDING" },
        data: { status: "CONFIRMED" },
      });

      if (claimed.count !== 1) {
        throw new ImportError("This import has already been confirmed.");
      }

      const payload = sessionPayloadSchema.safeParse(session.payload);

      if (!payload.success) {
        throw new ImportError("This preview is unreadable. Upload the file again.");
      }

      const { snapshotDate, holdings } = payload.data;

      if (!allowDuplicate) {
        const duplicate = await findDuplicate(tx, profileId, session.contentHash, snapshotDate);

        if (duplicate) {
          throw new ImportError("This portfolio snapshot appears to already exist.");
        }
      }

      const resolved = await resolveSecurities(tx, holdings.map((h) => h.normalizedName));
      let createdSecurities = 0;

      for (const holding of holdings) {
        if (resolved.has(holding.normalizedName)) {
          continue;
        }

        const security = await tx.security.create({
          data: {
            name: holding.sourceName,
            type: guessSecurityType(holding.sourceName),
            aliases: {
              create: { sourceName: holding.sourceName, normalizedName: holding.normalizedName },
            },
          },
          select: { id: true, name: true, ticker: true, type: true },
        });

        resolved.set(holding.normalizedName, security);
        createdSecurities++;
      }

      const snapshot = await tx.portfolioSnapshot.create({
        data: {
          profileId,
          snapshotDate: toDateOnly(snapshotDate),
          source: "TICKERTAPE_CSV",
          fileName: session.fileName,
          contentHash: session.contentHash,
          holdings: {
            createMany: {
              data: holdings.map((h) => ({
                securityId: resolved.get(h.normalizedName)!.id,
                sourceName: h.sourceName,
                quantity: h.quantity,
                averageBuyPrice: h.averageBuyPrice,
                investedAmount: h.investedAmount,
                currentPrice: h.currentPrice,
                currentValue: h.currentValue,
                weight: h.weight,
                pnlAmount: h.pnlAmount,
                pnlPercentage: h.pnlPercentage,
              })),
            },
          },
        },
        select: { id: true },
      });

      await tx.importSession.update({
        where: { id: sessionId },
        data: { snapshotId: snapshot.id },
      });

      return {
        snapshotId: snapshot.id,
        snapshotDate,
        holdingCount: holdings.length,
        createdSecurities,
      };
    },
    { timeout: 15_000 },
  );
}

export async function cancelImport(profileId: string, sessionId: string): Promise<void> {
  await prisma.importSession.updateMany({
    where: { id: sessionId, profileId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
}
