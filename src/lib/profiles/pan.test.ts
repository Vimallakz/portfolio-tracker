import { describe, expect, it } from "vitest";

import { isValidPan, maskPan } from "@/lib/profiles/pan";

describe("maskPan", () => {
  it("keeps the first five characters and the check character", () => {
    expect(maskPan("ABCDE1234F")).toBe("ABCDE****F");
  });

  it("returns null when no PAN is stored", () => {
    expect(maskPan(null)).toBeNull();
    expect(maskPan(undefined)).toBeNull();
    expect(maskPan("")).toBeNull();
  });

  it("normalises case and surrounding whitespace", () => {
    expect(maskPan("  abcde1234f  ")).toBe("ABCDE****F");
  });

  it("masks a short value entirely rather than leaking it", () => {
    expect(maskPan("ABC")).toBe("***");
  });
});

describe("isValidPan", () => {
  it("accepts the five-letter, four-digit, one-letter format", () => {
    expect(isValidPan("ABCDE1234F")).toBe(true);
    expect(isValidPan("abcde1234f")).toBe(true);
  });

  it("rejects wrong lengths and wrong character classes", () => {
    expect(isValidPan("ABCDE1234")).toBe(false);
    expect(isValidPan("ABCD12345F")).toBe(false);
    expect(isValidPan("ABCDE1234FF")).toBe(false);
    expect(isValidPan("")).toBe(false);
  });
});
