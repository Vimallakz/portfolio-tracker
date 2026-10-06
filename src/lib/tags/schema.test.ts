import { describe, expect, it } from "vitest";

import { tagNameSchema } from "@/lib/tags/schema";

describe("tagNameSchema", () => {
  it("trims and collapses whitespace", () => {
    expect(tagNameSchema.parse("  Long   Term ")).toBe("Long Term");
  });

  it("rejects blank and overlong names", () => {
    expect(tagNameSchema.safeParse("   ").success).toBe(false);
    expect(tagNameSchema.safeParse("x".repeat(41)).success).toBe(false);
  });
});
