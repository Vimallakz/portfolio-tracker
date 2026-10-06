import { describe, expect, it } from "vitest";

import { parseFileNameDate } from "@/lib/portfolio/importer/file-name-date";

describe("parseFileNameDate", () => {
  it.each([
    ["us_portfolio_report_12-Jul-26.csv", "2026-07-12"],
    ["vimal_us_portfolio_report_6-Oct-26.csv", "2026-10-06"],
    ["portfolio 22-JULY-2026.csv", "2026-07-22"],
    ["report_01_sept_2026.csv", "2026-09-01"],
    ["export-2026-07-12.csv", "2026-07-12"],
  ])("reads %s", (fileName, expected) => {
    expect(parseFileNameDate(fileName)).toBe(expected);
  });

  it.each([
    "holdings.csv",
    "report_31-Feb-26.csv",
    "report_12-Ju-26.csv",
    "report_12-Foo-26.csv",
    "export-2026-13-01.csv",
  ])("ignores %s", (fileName) => {
    expect(parseFileNameDate(fileName)).toBeNull();
  });
});
