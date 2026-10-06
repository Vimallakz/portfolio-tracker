import { describe, expect, it } from "vitest";

import { hashCsvContent } from "@/lib/portfolio/importer/content-hash";

describe("hashCsvContent", () => {
  it("matches the same content regardless of line endings, BOM and trailing blanks", () => {
    const original = hashCsvContent("a,b\n1,2\n");

    expect(hashCsvContent("\uFEFFa,b\r\n1,2\r\n\r\n")).toBe(original);
    expect(hashCsvContent("a,b  \n1,2")).toBe(original);
  });

  it("differs when any value changes", () => {
    expect(hashCsvContent("a,b\n1,2\n")).not.toBe(hashCsvContent("a,b\n1,3\n"));
  });
});
