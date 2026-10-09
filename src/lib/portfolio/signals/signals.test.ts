import { describe, expect, it } from "vitest";

import { evaluateSignals, type SignalInput, signalsInGroup, topSignals } from "@/lib/portfolio/signals/signals";

const NOW = new Date("2026-10-09T00:00:00Z");

const base: SignalInput = {
  securityId: "grab",
  name: "Grab Holdings",
  ticker: "GRAB",
  price: 3.11,
  priceSource: "snapshot",
  priceDate: "2026-09-30",
  previousPrice: 3.11,
  previousDate: "2026-08-30",
  averageBuyPrice: 3,
  isHeld: true,
  myTarget: null,
  analystTarget: null,
  accumulationMin: null,
  accumulationMax: null,
  stopPrice: null,
  conviction: null,
  investmentStatus: null,
  researchUpdatedAt: "2026-09-01T00:00:00Z",
};

const kinds = (input: Partial<SignalInput>) => evaluateSignals({ ...base, ...input }, NOW).signals.map((s) => s.kind);

describe("evaluateSignals", () => {
  it("flags a dip of 5% or more since the previous snapshot", () => {
    const result = evaluateSignals({ ...base, previousPrice: 3.3, myTarget: 5 }, NOW);
    expect(result.changeSincePrevious).toBeCloseTo(-5.76, 2);
    expect(result.signals[0]).toMatchObject({ kind: "dip", group: "opportunity", title: "Down 5.8% since Aug 30, 2026" });
    expect(kinds({ previousPrice: 3.2, myTarget: 5 })).not.toContain("dip");
  });

  it("flags a price below the average cost only for held securities", () => {
    const result = evaluateSignals({ ...base, averageBuyPrice: 3.5, myTarget: 5 }, NOW);
    expect(result.belowCostPercent).toBeCloseTo(11.14, 2);
    expect(result.signals.map((s) => s.kind)).toContain("below-cost");
    expect(kinds({ averageBuyPrice: 3.5, isHeld: false })).not.toContain("below-cost");
  });

  it("handles one-sided and two-sided buy zones", () => {
    expect(kinds({ accumulationMin: 3, accumulationMax: 3.2, myTarget: 5 })).toContain("in-zone");
    expect(kinds({ accumulationMax: 3.2, myTarget: 5 })).toContain("in-zone");
    expect(kinds({ accumulationMin: 3.2, myTarget: 5 })).not.toContain("in-zone");
  });

  it("keeps my target and the analyst target separate", () => {
    const result = evaluateSignals({ ...base, myTarget: 3.5, analystTarget: 5.76 }, NOW);
    expect(result.myUpside).toBeCloseTo(12.54, 2);
    expect(result.analystUpside).toBeCloseTo(85.21, 2);
    expect(result.signals.map((s) => s.kind)).toEqual(["analyst-upside", "target-gap"]);
    expect(result.signals[1]?.title).toBe("You are more cautious than analysts");
  });

  it("asks to review near or past my target, and above the analyst target", () => {
    expect(kinds({ myTarget: 3.2 })).toEqual(["near-my-target"]);
    expect(kinds({ myTarget: 3 })).toEqual(["above-my-target"]);
    expect(kinds({ analystTarget: 3 })).toEqual(["above-analyst-target"]);
  });

  it("puts the stop first and zeroes the opportunity score", () => {
    const result = evaluateSignals({ ...base, stopPrice: 3.2, previousPrice: 4, myTarget: 5 }, NOW);
    expect(result.signals[0]?.kind).toBe("stop-hit");
    expect(result.score).toBe(0);
  });

  it("flags stale research and a missing target", () => {
    expect(kinds({ researchUpdatedAt: "2026-05-01T00:00:00Z", myTarget: 5 })).toEqual(["stale-research"]);
    expect(kinds({})).toEqual(["no-target"]);
    expect(kinds({ isHeld: false, averageBuyPrice: null })).toEqual([]);
  });

  it("scores stronger opportunities higher", () => {
    const small = evaluateSignals({ ...base, previousPrice: 3.3, myTarget: 5 }, NOW);
    const big = evaluateSignals(
      { ...base, previousPrice: 3.8, averageBuyPrice: 3.6, accumulationMax: 3.2, analystTarget: 5.76, myTarget: 5, conviction: "HIGH" },
      NOW,
    );
    expect(big.score).toBeGreaterThan(small.score);
    expect(big.score).toBeLessThanOrEqual(100);
  });
});

describe("grouping", () => {
  const dip = evaluateSignals({ ...base, securityId: "dip", previousPrice: 3.5, myTarget: 5 }, NOW);
  const zone = evaluateSignals({ ...base, securityId: "zone", accumulationMax: 3.2, myTarget: 5 }, NOW);
  const stop = evaluateSignals({ ...base, securityId: "stop", stopPrice: 3.2, myTarget: 5 }, NOW);

  it("ranks opportunities by score", () => {
    expect(signalsInGroup([zone, dip, stop], "opportunity").map((e) => e.securityId)).toEqual(["dip", "zone"]);
  });

  it("puts actions before opportunities in the top list", () => {
    expect(topSignals([dip, zone, stop], 2).map((t) => t.entry.securityId)).toEqual(["stop", "dip"]);
  });
});
