import { describe, expect, it } from "vitest";

import { actionSignalsNotification, unsent, uploadReminderNotification } from "@/lib/notifications/digest";
import { getUploadReminderWindow } from "@/lib/portfolio/reminders/upload-reminder";
import { evaluateSignals, type SignalInput } from "@/lib/portfolio/signals/signals";

const profile = { id: "p1", name: "Gokul" };
const TODAY = "2026-10-29";

const base: SignalInput = {
  securityId: "s",
  name: "T-Mobile US Inc",
  ticker: "TMUS",
  price: 150,
  priceSource: "live",
  priceDate: TODAY,
  previousPrice: 150,
  previousDate: "2026-09-30",
  averageBuyPrice: 140,
  isHeld: true,
  myTarget: null,
  analystTarget: null,
  accumulationMin: null,
  accumulationMax: null,
  stopPrice: null,
  conviction: null,
  investmentStatus: null,
  researchUpdatedAt: null,
};

const entry = (input: Partial<SignalInput>) => evaluateSignals({ ...base, ...input }, new Date(`${TODAY}T00:00:00Z`));

describe("uploadReminderNotification", () => {
  it("asks for this month's CSV at month-end and links to the prefilled import", () => {
    const window = getUploadReminderWindow(TODAY)!;
    const { key, payload } = uploadReminderNotification(profile, window, TODAY, false);

    expect(key).toBe("upload:2026-10-29:p1");
    expect(payload.title).toBe("Time for October's snapshot");
    expect(payload.body).toContain("your month-end CSV");
    expect(payload.url).toBe("/import?date=2026-10-29");
  });

  it("says overdue in the first days of the next month, naming the profile when there are several", () => {
    const window = getUploadReminderWindow("2026-11-02")!;
    const { payload } = uploadReminderNotification(profile, window, "2026-11-02", true);

    expect(payload.title).toBe("October snapshot is overdue");
    expect(payload.body).toContain("Gokul's month-end CSV");
    expect(payload.url).toBe("/import?date=2026-10-31");
  });
});

describe("actionSignalsNotification", () => {
  it("returns nothing when no holding hit a stop or target", () => {
    expect(actionSignalsNotification(profile, [entry({ myTarget: 200 })], TODAY, false)).toBeNull();
  });

  it("names a single holding", () => {
    const result = actionSignalsNotification(profile, [entry({ myTarget: 140 })], TODAY, false)!;

    expect(result.key).toBe("signals:2026-10-29:p1");
    expect(result.payload.title).toBe("TMUS needs a decision");
    expect(result.payload.url).toBe("/focus");
  });

  it("puts stops first and summarizes beyond three", () => {
    const entries = [
      entry({ ticker: "AAA", myTarget: 140 }),
      entry({ ticker: "BBB", myTarget: 140 }),
      entry({ ticker: "CCC", myTarget: 140 }),
      entry({ ticker: "DDD", stopPrice: 160 }),
    ];
    const { payload } = actionSignalsNotification(profile, entries, TODAY, false)!;

    expect(payload.title).toBe("4 holdings need a decision");
    expect(payload.body.startsWith("DDD at or below your stop price")).toBe(true);
    expect(payload.body.endsWith("and 1 more.")).toBe(true);
  });

  it("ignores softer signals such as a dip or near target", () => {
    const entries = [entry({ previousPrice: 200 }), entry({ myTarget: 155 })];
    expect(actionSignalsNotification(profile, entries, TODAY, false)).toBeNull();
  });
});

describe("unsent", () => {
  it("drops notifications already logged today, keeping tomorrow's", () => {
    const window = getUploadReminderWindow(TODAY)!;
    const todayNote = uploadReminderNotification(profile, window, TODAY, false);
    const tomorrowNote = uploadReminderNotification(profile, getUploadReminderWindow("2026-10-30")!, "2026-10-30", false);

    expect(unsent([todayNote], new Set([todayNote.key]))).toEqual([]);
    expect(unsent([tomorrowNote], new Set([todayNote.key]))).toEqual([tomorrowNote]);
  });
});
