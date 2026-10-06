import { describe, expect, it } from "vitest";

import { CsvSyntaxError, parseCsv } from "@/lib/portfolio/importer/csv-parser";

describe("parseCsv", () => {
  it("splits rows and fields", () => {
    expect(parseCsv("a,b\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("handles CRLF, a BOM and a missing trailing newline", () => {
    expect(parseCsv("\uFEFFa,b\r\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps commas, quotes and newlines inside quoted fields", () => {
    expect(parseCsv('name,qty\n"Acme, Inc ""A""",3\n"Two\nLines",1')).toEqual([
      ["name", "qty"],
      ['Acme, Inc "A"', "3"],
      ["Two\nLines", "1"],
    ]);
  });

  it("keeps empty fields and drops blank lines", () => {
    expect(parseCsv("a,b,c\n1,,3\n\n,,\n")).toEqual([
      ["a", "b", "c"],
      ["1", "", "3"],
    ]);
  });

  it("rejects an unclosed quote", () => {
    expect(() => parseCsv('a\n"oops')).toThrow(CsvSyntaxError);
  });
});
