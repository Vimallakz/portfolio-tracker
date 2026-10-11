import { describe, expect, it } from "vitest";

import { evaluateGoal, requiredMonthlyContribution, type InvestmentGoal } from "@/lib/portfolio/planner/goal";
import { projectInvestment } from "@/lib/portfolio/planner/projection";

const goal = (overrides: Partial<InvestmentGoal> = {}): InvestmentGoal => ({
  name: "House",
  targetAmount: 10_000,
  targetMonth: "2028-12",
  inflationRate: null,
  ...overrides,
});

const base = { startValue: 1000, startInvested: 1000, monthlyReturn: 0.5, asOf: "2026-09-30" };

describe("requiredMonthlyContribution", () => {
  it("is the straight split of the gap when there is no return", () => {
    expect(requiredMonthlyContribution(1000, 7000, 12, 0)).toBeCloseTo(500, 6);
  });

  it("grows to exactly the target in the projection", () => {
    const monthly = requiredMonthlyContribution(1000, 10_000, 27, 0.5);
    const projected = projectInvestment({
      startValue: 1000,
      startInvested: 1000,
      monthlyContribution: monthly,
      monthlyReturn: 0.5,
      months: 27,
      stepUp: null,
    });

    expect(projected.finalValue).toBeCloseTo(10_000, 6);
  });

  it("is zero when the start value already grows past the target", () => {
    expect(requiredMonthlyContribution(10_000, 9000, 12, 0.5)).toBe(0);
  });
});

describe("evaluateGoal", () => {
  it("counts months from the latest snapshot's month to the target month", () => {
    expect(evaluateGoal({ goal: goal(), monthlyContribution: 300, ...base }).monthsLeft).toBe(27);
  });

  it("is behind when the pace falls short, with the shortfall and the monthly amount needed", () => {
    const result = evaluateGoal({ goal: goal(), monthlyContribution: 100, ...base });

    expect(result.status).toBe("behind");
    expect(result.gap).toBeLessThan(0);
    expect(result.requiredMonthly).toBeCloseTo(requiredMonthlyContribution(1000, 10_000, 27, 0.5), 6);
    expect(result.progress).toBeCloseTo(10, 6);
  });

  it("is ahead when the pace clears the target, and on track within 2%", () => {
    const needed = requiredMonthlyContribution(1000, 10_000, 27, 0.5);

    expect(evaluateGoal({ goal: goal(), monthlyContribution: needed * 1.5, ...base }).status).toBe("ahead");
    expect(evaluateGoal({ goal: goal(), monthlyContribution: needed, ...base }).status).toBe("on-track");
  });

  it("raises the target by inflation up to the target month", () => {
    const result = evaluateGoal({ goal: goal({ inflationRate: 3 }), monthlyContribution: 300, ...base });

    expect(result.targetAtDate).toBeCloseTo(10_000 * 1.03 ** (27 / 12), 6);
  });

  it("finds the month the pace first reaches the target", () => {
    // 1000 + 9 × 1000 at no return reaches 10,000 nine months on.
    const result = evaluateGoal({
      goal: goal(),
      ...base,
      monthlyReturn: 0,
      monthlyContribution: 1000,
    });

    expect(result.reachMonth).toBe("2027-06");
  });

  it("is reached once today's value covers the target, and missed once it is due without that", () => {
    expect(evaluateGoal({ goal: goal(), monthlyContribution: 0, ...base, startValue: 12_000 }).status).toBe(
      "reached",
    );

    const missed = evaluateGoal({ goal: goal({ targetMonth: "2026-06" }), monthlyContribution: 300, ...base });
    expect(missed.status).toBe("missed");
    expect(missed.requiredMonthly).toBeNull();
  });

  it("never reaches a target the pace cannot grow into", () => {
    expect(evaluateGoal({ goal: goal(), ...base, monthlyReturn: 0, monthlyContribution: 0 }).reachMonth).toBeNull();
  });
});
