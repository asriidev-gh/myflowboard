import { describe, expect, it } from "vitest";

import {
  getDueVisualState,
  toDatetimeLocalValue,
  fromDatetimeLocalValue,
} from "@/features/cards/due-date";

describe("due date helpers", () => {
  it("returns none without a due date", () => {
    expect(getDueVisualState(null, false)).toBe("none");
    expect(getDueVisualState(undefined, false)).toBe("none");
  });

  it("marks completed cards", () => {
    expect(getDueVisualState(new Date(), true)).toBe("completed");
  });

  it("marks overdue dates in the past (not today)", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);
    expect(getDueVisualState(yesterday, false)).toBe("overdue");
  });

  it("marks dates within 24 hours as soon", () => {
    const soon = new Date(Date.now() + 2 * 60 * 60 * 1000);
    expect(getDueVisualState(soon, false)).toBe("soon");
  });

  it("round-trips datetime-local values", () => {
    const iso = fromDatetimeLocalValue("2030-06-15T14:30");
    expect(iso).toBeTruthy();
    expect(toDatetimeLocalValue(iso)).toMatch(/^2030-06-15T14:30/);
    expect(fromDatetimeLocalValue("")).toBeNull();
  });
});
