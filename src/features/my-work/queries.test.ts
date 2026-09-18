import { describe, expect, it } from "vitest";

import {
  groupMyWorkCards,
  type MyWorkCard,
} from "@/features/my-work/queries";

function card(
  partial: Partial<MyWorkCard> & Pick<MyWorkCard, "id" | "title">,
): MyWorkCard {
  return {
    dueDate: null,
    isCompleted: false,
    boardId: "b1",
    boardName: "Board",
    listName: "List",
    workspaceName: "WS",
    labels: [],
    ...partial,
  };
}

describe("groupMyWorkCards", () => {
  it("buckets overdue, today, upcoming, and undated", () => {
    const overdue = new Date();
    overdue.setDate(overdue.getDate() - 3);

    const today = new Date();
    today.setHours(15, 0, 0, 0);

    const upcoming = new Date();
    upcoming.setDate(upcoming.getDate() + 5);

    const groups = groupMyWorkCards([
      card({ id: "1", title: "Late", dueDate: overdue }),
      card({ id: "2", title: "Today", dueDate: today }),
      card({ id: "3", title: "Later", dueDate: upcoming }),
      card({ id: "4", title: "None" }),
      card({ id: "5", title: "Done", dueDate: overdue, isCompleted: true }),
    ]);

    expect(groups.overdue.map((c) => c.id)).toEqual(["1"]);
    expect(groups.today.map((c) => c.id)).toEqual(["2"]);
    expect(groups.upcoming.map((c) => c.id)).toEqual(["3"]);
    expect(groups.none.map((c) => c.id).sort()).toEqual(["4", "5"]);
  });
});
