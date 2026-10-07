import { describe, expect, it } from "vitest";

import { getUploadReminderWindow, lastDayOfMonth, todayInTimeZone } from "./upload-reminder";

describe("getUploadReminderWindow", () => {
  it("is closed between the 6th and the 27th", () => {
    expect(getUploadReminderWindow("2026-10-06")).toBeNull();
    expect(getUploadReminderWindow("2026-10-15")).toBeNull();
    expect(getUploadReminderWindow("2026-10-27")).toBeNull();
  });

  it("asks for the current month from the 28th, prefilled with today", () => {
    expect(getUploadReminderWindow("2026-10-28")).toEqual({
      month: "2026-10",
      coveredFrom: "2026-10-28",
      coveredTo: "2026-10-31",
      suggestedDate: "2026-10-28",
      isOverdue: false,
    });
    expect(getUploadReminderWindow("2026-10-31")?.month).toBe("2026-10");
  });

  it("asks for the previous month on days 1-5, prefilled with its last day", () => {
    expect(getUploadReminderWindow("2026-11-01")).toEqual({
      month: "2026-10",
      coveredFrom: "2026-10-28",
      coveredTo: "2026-10-31",
      suggestedDate: "2026-10-31",
      isOverdue: true,
    });
    expect(getUploadReminderWindow("2026-11-05")?.month).toBe("2026-10");
  });

  it("rolls back across the year boundary", () => {
    expect(getUploadReminderWindow("2027-01-03")).toMatchObject({ month: "2026-12", suggestedDate: "2026-12-31" });
  });

  it("handles February in common and leap years", () => {
    expect(getUploadReminderWindow("2027-02-28")).toMatchObject({ month: "2027-02", coveredTo: "2027-02-28" });
    expect(getUploadReminderWindow("2028-03-02")).toMatchObject({ month: "2028-02", suggestedDate: "2028-02-29" });
  });
});

describe("lastDayOfMonth", () => {
  it("returns the final calendar day", () => {
    expect(lastDayOfMonth("2026-04")).toBe("2026-04-30");
    expect(lastDayOfMonth("2026-12")).toBe("2026-12-31");
  });
});

describe("todayInTimeZone", () => {
  it("uses the given zone's calendar date, not UTC", () => {
    const lateEveningUtc = new Date("2026-10-27T20:00:00Z");

    expect(todayInTimeZone(lateEveningUtc, "UTC")).toBe("2026-10-27");
    expect(todayInTimeZone(lateEveningUtc, "Asia/Kolkata")).toBe("2026-10-28");
  });
});
