import { describe, expect, it } from "vitest";

import {
  emptyResearchFormValues,
  researchFormSchema,
  researchInputSchema,
  toResearchFormValues,
} from "@/lib/research/schema";

describe("researchInputSchema", () => {
  it("stores blank fields as null", () => {
    const stored = researchInputSchema.parse(emptyResearchFormValues);

    expect(Object.values(stored).every((value) => value === null)).toBe(true);
  });

  it("keeps prices as decimal strings and enums as given", () => {
    const stored = researchInputSchema.parse({
      ...emptyResearchFormValues,
      thesis: "  Super-app  ",
      targetPrice: "8",
      accumulationMin: "4.5",
      accumulationMax: "5.0000",
      conviction: "HIGH",
      investmentStatus: "HOLD",
    });

    expect(stored).toMatchObject({
      thesis: "Super-app",
      targetPrice: "8",
      accumulationMin: "4.5",
      accumulationMax: "5.0000",
      conviction: "HIGH",
      investmentStatus: "HOLD",
    });
  });

  it("rejects zero, negative and over-precise prices", () => {
    for (const targetPrice of ["0", "-1", "1.23456", "abc"]) {
      expect(researchFormSchema.safeParse({ ...emptyResearchFormValues, targetPrice }).success).toBe(false);
    }
  });

  it("rejects an accumulation zone whose lower price exceeds the upper", () => {
    const result = researchFormSchema.safeParse({ ...emptyResearchFormValues, accumulationMin: "5", accumulationMax: "4.5" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["accumulationMax"]);
  });

  it("allows a one-sided accumulation zone", () => {
    expect(researchFormSchema.safeParse({ ...emptyResearchFormValues, accumulationMin: "5" }).success).toBe(true);
  });
});

describe("toResearchFormValues", () => {
  it("round-trips stored research back into form values", () => {
    const form = { ...emptyResearchFormValues, bullCase: "Margins expand", stopPrice: "3.8", conviction: "LOW" as const };

    expect(toResearchFormValues(researchInputSchema.parse(form))).toEqual(form);
    expect(toResearchFormValues(null)).toEqual(emptyResearchFormValues);
  });
});
