import { describe, expect, it } from "vitest";

import {
  loginSchema,
  registerSchema,
} from "@/features/auth/schemas";

describe("auth schemas", () => {
  it("accepts a valid login payload", () => {
    const result = loginSchema.safeParse({
      email: "john@acme.dev",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid login email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "x",
    });
    expect(result.success).toBe(false);
  });

  it("enforces register password rules and confirmation", () => {
    expect(
      registerSchema.safeParse({
        name: "Ada",
        email: "ada@example.com",
        password: "short1",
        confirmPassword: "short1",
      }).success,
    ).toBe(false);

    expect(
      registerSchema.safeParse({
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "password123",
        confirmPassword: "password124",
      }).success,
    ).toBe(false);

    expect(
      registerSchema.safeParse({
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "password123",
        confirmPassword: "password123",
      }).success,
    ).toBe(true);
  });
});
