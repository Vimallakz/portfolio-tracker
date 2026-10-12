import { describe, expect, it } from "vitest";

import type { ExtensionSecurity } from "../../src/lib/extension/contract";
import { cardRows, chipView, formatPrice } from "./format";
import { normalizeAppUrl } from "./messages";
import { slugFromHref, slugFromPath } from "./selectors";

const nu: ExtensionSecurity = {
  securityId: "sec_1",
  slug: "NU",
  ticker: "NU",
  name: "Nu Holdings Ltd",
  isHeld: true,
  status: "ACCUMULATE",
  statusLabel: "Accumulate",
  conviction: "MEDIUM",
  convictionLabel: "Medium",
  price: 16.05,
  priceSource: "live",
  priceDate: "2026-10-12",
  averageBuyPrice: 14.24,
  myTarget: 18.5,
  myUpside: 15.26,
  analystTarget: 18.77,
  analystUpside: 16.947,
  accumulationMin: 14,
  accumulationMax: 17,
  inZone: true,
  stopPrice: null,
  stopHit: false,
  signals: [],
  url: "http://localhost:3000/securities/sec_1",
};

describe("slugFromPath", () => {
  it("reads the ticker from Tickertape's stock paths", () => {
    expect(slugFromPath("/us-stocks/nu-holdings-ltd-NU-share-price")).toBe("NU");
    expect(slugFromPath("/us-stocks/alphabet-inc-class-a-GOOGL-share-price/")).toBe("GOOGL");
    expect(slugFromPath("/us-stocks/berkshire-hathaway-inc-BRK.B-share-price")).toBe("BRK.B");
    expect(slugFromPath("/us-stocks/NU")).toBe("NU");
  });

  it("ignores section pages and other paths", () => {
    expect(slugFromPath("/us-stocks")).toBeNull();
    expect(slugFromPath("/us-stocks/screener")).toBeNull();
    expect(slugFromPath("/us-stocks/nu/forecast")).toBeNull();
    expect(slugFromPath("/stocks/itc-ITC")).toBeNull();
  });
});

describe("slugFromHref", () => {
  it("handles relative and absolute links", () => {
    expect(slugFromHref("/us-stocks/nu-holdings-ltd-NU-share-price")).toBe("NU");
    expect(slugFromHref("https://www.tickertape.in/us-stocks/nu-holdings-ltd-NU-share-price?ref=pf")).toBe("NU");
  });
});

describe("chipView", () => {
  it("shows analyst upside, a reached target, the status, or no research", () => {
    expect(chipView(nu)).toEqual({ text: "Target +16.9%", tone: "positive", stopHit: false });
    expect(chipView({ ...nu, analystUpside: -2 })).toMatchObject({ text: "Target reached", tone: "muted" });
    expect(chipView({ ...nu, analystUpside: null })).toMatchObject({ text: "Accumulate", tone: "muted" });
    expect(chipView({ ...nu, analystUpside: null, statusLabel: null })).toMatchObject({ text: "No research" });
    expect(chipView(undefined)).toMatchObject({ text: "No research", tone: "muted" });
  });

  it("marks a hit stop", () => {
    expect(chipView({ ...nu, stopHit: true }).stopHit).toBe(true);
  });
});

describe("cardRows", () => {
  it("lists price, targets, zone and cost, skipping levels that are not set", () => {
    expect(cardRows(nu).map((row) => [row.label, row.value, row.note])).toEqual([
      ["Live price", "$16.05", undefined],
      ["My target", "$18.50", "+15.3%"],
      ["Analyst target", "$18.77", "+16.9%"],
      ["Buy zone", "$14.00 – $17.00", "Inside"],
      ["Average cost", "$14.24", undefined],
    ]);
  });

  it("shows the stop and the snapshot date", () => {
    const rows = cardRows({ ...nu, priceSource: "snapshot", priceDate: "2026-10-10", stopPrice: 17, stopHit: true });

    expect(rows[0]).toMatchObject({ label: "Last price", note: "2026-10-10" });
    expect(rows.find((row) => row.label === "Stop")).toMatchObject({ value: "$17.00", note: "Hit", tone: "negative" });
  });
});

describe("formatPrice", () => {
  it("keeps more digits for penny stocks", () => {
    expect(formatPrice(0.4871)).toBe("$0.4871");
    expect(formatPrice(1234.5)).toBe("$1,234.50");
    expect(formatPrice(null)).toBe("—");
  });
});

describe("normalizeAppUrl", () => {
  it("reduces input to an origin, defaulting to http only for localhost", () => {
    expect(normalizeAppUrl("localhost:3000")).toBe("http://localhost:3000");
    expect(normalizeAppUrl("http://localhost:3000/settings")).toBe("http://localhost:3000");
    expect(normalizeAppUrl("portfolio.example.com/")).toBe("https://portfolio.example.com");
    expect(normalizeAppUrl("  ")).toBeNull();
  });
});
