import { describe, expect, it } from "vitest";

import { isActiveNavItem } from "@/lib/config/navigation";

describe("isActiveNavItem", () => {
  it("matches the exact route", () => {
    expect(isActiveNavItem("/dashboard", "/dashboard")).toBe(true);
    expect(isActiveNavItem("/securities", "/dashboard")).toBe(false);
  });

  it("keeps a parent highlighted on its detail routes", () => {
    expect(isActiveNavItem("/securities", "/securities/grab")).toBe(true);
    expect(isActiveNavItem("/history", "/history/2026-10")).toBe(true);
  });

  it("prefers the longest matching route so nested items win", () => {
    expect(isActiveNavItem("/settings/tags", "/settings/tags/growth")).toBe(
      true,
    );
    expect(isActiveNavItem("/settings", "/settings/tags/growth")).toBe(false);
  });

  it("activates only the child when the path matches it exactly", () => {
    expect(isActiveNavItem("/settings/profile", "/settings/profile")).toBe(
      true,
    );
    expect(isActiveNavItem("/settings", "/settings/profile")).toBe(false);
  });

  it("leaves everything inactive on an unknown path", () => {
    expect(isActiveNavItem("/dashboard", "/nope")).toBe(false);
    expect(isActiveNavItem("/settings", "/nope")).toBe(false);
  });
});
