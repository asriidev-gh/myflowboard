import { describe, expect, it } from "vitest";

import { slugify, uniqueSlugCandidate } from "@/lib/workspaces/slug";

describe("workspace slug helpers", () => {
  it("slugifies names", () => {
    expect(slugify("Hello World")).toBe("hello-world");
    expect(slugify("  ACME!! Team  ")).toBe("acme-team");
    expect(slugify("@@@")).toBe("workspace");
  });

  it("builds unique candidates", () => {
    expect(uniqueSlugCandidate("acme", 0)).toBe("acme");
    expect(uniqueSlugCandidate("acme", 2)).toBe("acme-2");
  });
});
