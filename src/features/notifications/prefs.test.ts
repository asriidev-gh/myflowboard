import { describe, expect, it } from "vitest";

import { shouldSendNotification } from "@/features/notifications/prefs";

const allOn = {
  assignedToCard: true,
  mentioned: true,
  dueDateReminder: true,
  cardCommented: true,
  boardInvited: true,
};

describe("shouldSendNotification", () => {
  it("sends when prefs are missing", () => {
    expect(shouldSendNotification(null, "CARD_ASSIGNED")).toBe(true);
    expect(shouldSendNotification(undefined, "CARD_COMMENTED")).toBe(true);
  });

  it("respects disabled preference flags", () => {
    expect(
      shouldSendNotification(
        { ...allOn, assignedToCard: false },
        "CARD_ASSIGNED",
      ),
    ).toBe(false);
    expect(
      shouldSendNotification(
        { ...allOn, cardCommented: false },
        "CARD_COMMENTED",
      ),
    ).toBe(false);
    expect(
      shouldSendNotification(
        { ...allOn, boardInvited: false },
        "WORKSPACE_INVITED",
      ),
    ).toBe(false);
  });

  it("allows enabled prefs and unmapped types", () => {
    expect(shouldSendNotification(allOn, "CARD_ASSIGNED")).toBe(true);
    expect(shouldSendNotification(allOn, "GENERAL")).toBe(true);
  });
});
