import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { changePasswordFormSchema, loginFormSchema, safeRedirectPath, signupFormSchema } from "@/lib/auth/schema";

describe("password hashing", () => {
  it("verifies the original password and rejects others", async () => {
    const hash = await hashPassword("correct horse");

    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$/);
    await expect(verifyPassword("correct horse", hash)).resolves.toBe(true);
    await expect(verifyPassword("correct horsE", hash)).resolves.toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("rejects empty or malformed stored hashes", async () => {
    await expect(verifyPassword("anything", "")).resolves.toBe(false);
    await expect(verifyPassword("anything", "bcrypt$abc")).resolves.toBe(false);
  });
});

describe("auth schemas", () => {
  it("normalises email to lowercase", () => {
    const parsed = loginFormSchema.parse({ email: "  Me@Example.COM ", password: "x" });
    expect(parsed.email).toBe("me@example.com");
  });

  it("requires matching passwords of minimum length on signup", () => {
    const base = { name: "", email: "a@b.co" };

    expect(signupFormSchema.safeParse({ ...base, password: "short", confirmPassword: "short" }).success).toBe(false);
    expect(signupFormSchema.safeParse({ ...base, password: "longenough", confirmPassword: "different" }).success).toBe(
      false,
    );
    expect(signupFormSchema.safeParse({ ...base, password: "longenough", confirmPassword: "longenough" }).success).toBe(
      true,
    );
  });
});

describe("changePasswordFormSchema", () => {
  const valid = { currentPassword: "oldpassword", newPassword: "newpassword", confirmPassword: "newpassword" };

  it("accepts a different, confirmed new password", () => {
    expect(changePasswordFormSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects reusing the current password or a mismatched confirmation", () => {
    expect(
      changePasswordFormSchema.safeParse({ ...valid, newPassword: "oldpassword", confirmPassword: "oldpassword" }).success,
    ).toBe(false);
    expect(changePasswordFormSchema.safeParse({ ...valid, confirmPassword: "nope" }).success).toBe(false);
  });
});

describe("safeRedirectPath", () => {
  it("keeps same-site paths", () => {
    expect(safeRedirectPath("/history?x=1")).toBe("/history?x=1");
  });

  it("falls back to the dashboard for anything else", () => {
    for (const next of [undefined, "", "https://evil.com", "//evil.com", "/\\evil.com", ["/a"]]) {
      expect(safeRedirectPath(next)).toBe("/dashboard");
    }
  });
});
