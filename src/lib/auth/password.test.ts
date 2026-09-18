import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("hashes and verifies a password", async () => {
    const hashed = await hashPassword("password123");
    expect(hashed).not.toBe("password123");
    expect(await verifyPassword("password123", hashed)).toBe(true);
    expect(await verifyPassword("wrong-password", hashed)).toBe(false);
  });
});
