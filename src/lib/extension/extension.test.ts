import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ env: {}, isProduction: false }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

const { hashApiToken, readBearerToken } = await import("@/lib/auth/api-token");
const { createRateLimiter } = await import("@/lib/extension/rate-limit");
const { tickertapeSlug, toExtensionSecurity } = await import("@/lib/extension/securities");
const { evaluateSignals } = await import("@/lib/portfolio/signals/signals");

const ORIGIN = "http://localhost:3000";
const security = { id: "sec_1", name: "Nu Holdings Ltd", ticker: "NU", tickertapeTicker: null };

function signalsFor(overrides: Partial<Parameters<typeof evaluateSignals>[0]> = {}) {
  return evaluateSignals(
    {
      securityId: "sec_1",
      name: "Nu Holdings Ltd",
      ticker: "NU",
      price: 16,
      priceSource: "live",
      priceDate: "2026-10-12",
      previousPrice: null,
      previousDate: null,
      averageBuyPrice: 14,
      isHeld: true,
      myTarget: 18,
      analystTarget: 20,
      accumulationMin: 14,
      accumulationMax: 17,
      stopPrice: 12,
      conviction: "MEDIUM",
      investmentStatus: "ACCUMULATE",
      researchUpdatedAt: "2026-10-01T00:00:00.000Z",
      ...overrides,
    },
    new Date("2026-10-12T00:00:00.000Z"),
  );
}

describe("readBearerToken", () => {
  it("reads an extension token", () => {
    expect(readBearerToken("Bearer pit_ext_abc123")).toBe("pit_ext_abc123");
    expect(readBearerToken("bearer   pit_ext_abc123")).toBe("pit_ext_abc123");
  });

  it("rejects missing, malformed and foreign tokens", () => {
    expect(readBearerToken(null)).toBeNull();
    expect(readBearerToken("pit_ext_abc123")).toBeNull();
    expect(readBearerToken("Bearer other_abc123")).toBeNull();
    expect(readBearerToken("Bearer pit_ext_a pit_ext_b")).toBeNull();
    expect(readBearerToken("Basic pit_ext_abc123")).toBeNull();
  });
});

describe("hashApiToken", () => {
  it("is a stable SHA-256 hex digest that differs per token", () => {
    const hash = hashApiToken("pit_ext_abc");

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashApiToken("pit_ext_abc")).toBe(hash);
    expect(hashApiToken("pit_ext_abd")).not.toBe(hash);
  });
});

describe("createRateLimiter", () => {
  it("allows up to the limit per key, then resets after the window", () => {
    const allow = createRateLimiter({ limit: 2, windowMs: 1000 });

    expect(allow("a", 0)).toBe(true);
    expect(allow("a", 10)).toBe(true);
    expect(allow("a", 20)).toBe(false);
    expect(allow("b", 20)).toBe(true);
    expect(allow("a", 1000)).toBe(true);
  });
});

describe("tickertapeSlug", () => {
  it("prefers the Tickertape ticker and uppercases it", () => {
    expect(tickertapeSlug({ ticker: "BRK-B", tickertapeTicker: "brk.b" })).toBe("BRK.B");
    expect(tickertapeSlug({ ticker: " nu ", tickertapeTicker: null })).toBe("NU");
    expect(tickertapeSlug({ ticker: null, tickertapeTicker: null })).toBeNull();
  });
});

describe("toExtensionSecurity", () => {
  it("carries the signal numbers and labels for a priced security", () => {
    const result = toExtensionSecurity(security, signalsFor(), null, ORIGIN);

    expect(result).toMatchObject({
      slug: "NU",
      isHeld: true,
      statusLabel: "Accumulate",
      convictionLabel: "Medium",
      price: 16,
      priceSource: "live",
      myTarget: 18,
      analystTarget: 20,
      inZone: true,
      stopHit: false,
      url: "http://localhost:3000/securities/sec_1",
    });
    expect(result?.analystUpside).toBeCloseTo(25);
    expect(result?.signals.map((signal) => signal.title)).toContain("Inside your buy zone");
  });

  it("flags a hit stop and a price outside the zone", () => {
    const result = toExtensionSecurity(security, signalsFor({ price: 11 }), null, ORIGIN);

    expect(result).toMatchObject({ stopHit: true, inZone: false });
  });

  it("keeps research levels without a price", () => {
    const result = toExtensionSecurity(
      security,
      null,
      {
        myTarget: 18,
        analystTarget: 20,
        accumulationMin: 14,
        accumulationMax: 17,
        stopPrice: 12,
        conviction: "LOW",
        investmentStatus: "WATCH",
      },
      ORIGIN,
    );

    expect(result).toMatchObject({
      isHeld: false,
      statusLabel: "Watch",
      price: null,
      analystTarget: 20,
      analystUpside: null,
      inZone: false,
      stopHit: false,
      signals: [],
    });
  });

  it("skips securities with no ticker to match on", () => {
    expect(toExtensionSecurity({ ...security, ticker: null }, null, null, ORIGIN)).toBeNull();
  });
});
