import { describe, expect, it } from "vitest";

import {
  createBoardSchema,
  createCardSchema,
  createListSchema,
} from "@/features/boards/schemas";

describe("board schemas", () => {
  it("validates board creation", () => {
    expect(
      createBoardSchema.safeParse({
        workspaceId: "ws_1",
        name: "Launch",
        withDefaultLists: true,
      }).success,
    ).toBe(true);

    expect(
      createBoardSchema.safeParse({
        workspaceId: "ws_1",
        name: "",
      }).success,
    ).toBe(false);
  });

  it("validates list and card creation", () => {
    expect(
      createListSchema.safeParse({
        boardId: "b1",
        name: "Backlog",
      }).success,
    ).toBe(true);

    expect(
      createCardSchema.safeParse({
        listId: "l1",
        title: "Write tests",
      }).success,
    ).toBe(true);

    expect(
      createCardSchema.safeParse({
        listId: "l1",
        title: "",
      }).success,
    ).toBe(false);
  });
});
