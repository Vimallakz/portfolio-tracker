import Decimal from "decimal.js";
import { z } from "zod";

import { CONVICTIONS, INVESTMENT_STATUSES } from "@/lib/research/labels";

/** Matches the Decimal(20, 4) price columns. */
const PRICE_PATTERN = /^\d{1,16}(?:\.\d{1,4})?$/;

const text = (max: number) => z.string().trim().max(max, `Must be ${max} characters or fewer`);

const price = z
  .string()
  .trim()
  .refine((value) => value === "" || (PRICE_PATTERN.test(value) && new Decimal(value).gt(0)), {
    message: "Enter a positive price with up to 4 decimals, like 4.50",
  });

const blankOrOneOf = <T extends string>(values: readonly T[]) =>
  z.union([z.literal(""), z.enum(values as [T, ...T[]])]);

/**
 * A profile's research on one security, in the form's own terms: every field
 * is a string because that is what an input produces. Shared by the client
 * form and the server action; the server always re-validates.
 */
export const researchFormSchema = z
  .object({
    thesis: text(5000),
    whyBought: text(5000),
    businessDescription: text(5000),
    bullCase: text(5000),
    baseCase: text(5000),
    bearCase: text(5000),
    targetPrice: price,
    accumulationMin: price,
    accumulationMax: price,
    stopPrice: price,
    expectedHoldingPeriod: text(100),
    conviction: blankOrOneOf(CONVICTIONS),
    investmentStatus: blankOrOneOf(INVESTMENT_STATUSES),
    risks: text(5000),
    personalNotes: text(5000),
  })
  .refine(
    ({ accumulationMin, accumulationMax }) =>
      !accumulationMin ||
      !accumulationMax ||
      !PRICE_PATTERN.test(accumulationMin) ||
      !PRICE_PATTERN.test(accumulationMax) ||
      new Decimal(accumulationMin).lte(accumulationMax),
    { message: "The zone's lower price must not exceed its upper price", path: ["accumulationMax"] },
  );

export type ResearchFormValues = z.infer<typeof researchFormSchema>;

export const emptyResearchFormValues: ResearchFormValues = {
  thesis: "",
  whyBought: "",
  businessDescription: "",
  bullCase: "",
  baseCase: "",
  bearCase: "",
  targetPrice: "",
  accumulationMin: "",
  accumulationMax: "",
  stopPrice: "",
  expectedHoldingPeriod: "",
  conviction: "",
  investmentStatus: "",
  risks: "",
  personalNotes: "",
};

/** Storage shape: blanks become NULL, prices stay decimal strings for Prisma. */
export const researchInputSchema = researchFormSchema.transform((values) => {
  const orNull = (value: string) => value || null;

  return {
    thesis: orNull(values.thesis),
    whyBought: orNull(values.whyBought),
    businessDescription: orNull(values.businessDescription),
    bullCase: orNull(values.bullCase),
    baseCase: orNull(values.baseCase),
    bearCase: orNull(values.bearCase),
    targetPrice: orNull(values.targetPrice),
    accumulationMin: orNull(values.accumulationMin),
    accumulationMax: orNull(values.accumulationMax),
    stopPrice: orNull(values.stopPrice),
    expectedHoldingPeriod: orNull(values.expectedHoldingPeriod),
    conviction: values.conviction || null,
    investmentStatus: values.investmentStatus || null,
    risks: orNull(values.risks),
    personalNotes: orNull(values.personalNotes),
  };
});

export type ResearchInput = z.output<typeof researchInputSchema>;

/** Stored research, prices as decimal strings, back into form values. */
export function toResearchFormValues(research: ResearchInput | null): ResearchFormValues {
  if (!research) {
    return emptyResearchFormValues;
  }

  return {
    thesis: research.thesis ?? "",
    whyBought: research.whyBought ?? "",
    businessDescription: research.businessDescription ?? "",
    bullCase: research.bullCase ?? "",
    baseCase: research.baseCase ?? "",
    bearCase: research.bearCase ?? "",
    targetPrice: research.targetPrice ?? "",
    accumulationMin: research.accumulationMin ?? "",
    accumulationMax: research.accumulationMax ?? "",
    stopPrice: research.stopPrice ?? "",
    expectedHoldingPeriod: research.expectedHoldingPeriod ?? "",
    conviction: research.conviction ?? "",
    investmentStatus: research.investmentStatus ?? "",
    risks: research.risks ?? "",
    personalNotes: research.personalNotes ?? "",
  };
}
