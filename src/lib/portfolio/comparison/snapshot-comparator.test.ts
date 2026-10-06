import { describe, expect, it } from "vitest";

import {
  compareSnapshots,
  type ComparableHolding,
} from "@/lib/portfolio/comparison/snapshot-comparator";

function holding(key: string, quantity: string, overrides: Partial<ComparableHolding> = {}): ComparableHolding {
  return {
    key,
    name: key,
    quantity,
    averageBuyPrice: "5",
    investedAmount: "500",
    currentValue: "700",
    weight: "10",
    pnlAmount: "200",
    pnlPercentage: "40",
    ...overrides,
  };
}

describe("compareSnapshots", () => {
  it("marks every holding NEW on the first import", () => {
    const { summary, holdings } = compareSnapshots(null, [holding("GRAB", "100")]);

    expect(holdings[0].status).toBe("NEW");
    expect(holdings[0].changes).toBeNull();
    expect(summary).toMatchObject({ totalHoldings: 1, existing: 0, new: 1, removed: 0 });
  });

  it("detects new, removed, increased, reduced and unchanged holdings", () => {
    const previous = [holding("GRAB", "100"), holding("VOO", "5"), holding("NVDA", "10"), holding("XYZ", "50")];
    const next = [holding("GRAB", "120"), holding("VOO", "5"), holding("NVDA", "8"), holding("QQQ", "3")];

    const { summary, holdings } = compareSnapshots(previous, next);

    expect(Object.fromEntries(holdings.map((h) => [h.key, h.status]))).toEqual({
      QQQ: "NEW",
      GRAB: "INCREASED",
      NVDA: "REDUCED",
      VOO: "UNCHANGED",
      XYZ: "REMOVED",
    });
    expect(summary).toEqual({
      totalHoldings: 4,
      existing: 3,
      new: 1,
      removed: 1,
      increased: 1,
      reduced: 1,
      unchanged: 1,
    });
  });

  it("calculates per-metric changes for existing holdings", () => {
    const previous = [holding("GRAB", "100", { investedAmount: "500", currentValue: "700", pnlAmount: "200" })];
    const next = [holding("GRAB", "120", { investedAmount: "650", currentValue: "840", pnlAmount: "190" })];

    const [grab] = compareSnapshots(previous, next).holdings;

    expect(grab.changes).toMatchObject({
      quantity: "20",
      investedAmount: "150",
      currentValue: "140",
      pnlAmount: "-10",
    });
  });

  it("handles fractional quantity changes exactly", () => {
    const [voo] = compareSnapshots([holding("VOO", "0.1")], [holding("VOO", "0.3")]).holdings;

    expect(voo.status).toBe("INCREASED");
    expect(voo.changes?.quantity).toBe("0.2");
  });
});
