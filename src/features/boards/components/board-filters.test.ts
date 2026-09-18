import { describe, expect, it } from "vitest";

import {
  EMPTY_BOARD_FILTERS,
  cardMatchesFilters,
  isBoardFiltersActive,
} from "@/features/boards/components/board-filters";

const baseCard = {
  dueDate: null as Date | null,
  isCompleted: false,
  labels: [{ id: "bug" }],
  members: [{ id: "u1" }],
};

describe("board filters", () => {
  it("treats empty filters as inactive", () => {
    expect(isBoardFiltersActive(EMPTY_BOARD_FILTERS)).toBe(false);
  });

  it("filters by member", () => {
    expect(
      cardMatchesFilters(baseCard, {
        ...EMPTY_BOARD_FILTERS,
        memberIds: ["u1"],
      }),
    ).toBe(true);
    expect(
      cardMatchesFilters(baseCard, {
        ...EMPTY_BOARD_FILTERS,
        memberIds: ["u2"],
      }),
    ).toBe(false);
  });

  it("filters by label", () => {
    expect(
      cardMatchesFilters(baseCard, {
        ...EMPTY_BOARD_FILTERS,
        labelIds: ["bug"],
      }),
    ).toBe(true);
    expect(
      cardMatchesFilters(baseCard, {
        ...EMPTY_BOARD_FILTERS,
        labelIds: ["feature"],
      }),
    ).toBe(false);
  });

  it("filters by completion", () => {
    expect(
      cardMatchesFilters(
        { ...baseCard, isCompleted: true },
        { ...EMPTY_BOARD_FILTERS, completed: "done" },
      ),
    ).toBe(true);
    expect(
      cardMatchesFilters(
        { ...baseCard, isCompleted: true },
        { ...EMPTY_BOARD_FILTERS, completed: "open" },
      ),
    ).toBe(false);
  });

  it("filters cards with no due date", () => {
    expect(
      cardMatchesFilters(baseCard, {
        ...EMPTY_BOARD_FILTERS,
        due: "none",
      }),
    ).toBe(true);
    expect(
      cardMatchesFilters(
        { ...baseCard, dueDate: new Date() },
        { ...EMPTY_BOARD_FILTERS, due: "none" },
      ),
    ).toBe(false);
  });
});
