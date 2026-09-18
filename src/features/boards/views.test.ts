import { describe, expect, it } from "vitest";

import {
  flattenBoardCards,
  parseBoardViewMode,
} from "@/features/boards/views";
import type { BoardListModel } from "@/features/boards/components/board-canvas";

describe("board views helpers", () => {
  it("parses view query values", () => {
    expect(parseBoardViewMode(undefined)).toBe("board");
    expect(parseBoardViewMode("board")).toBe("board");
    expect(parseBoardViewMode("calendar")).toBe("calendar");
    expect(parseBoardViewMode("table")).toBe("table");
    expect(parseBoardViewMode("nope")).toBe("board");
  });

  it("flattens cards with list context", () => {
    const lists: BoardListModel[] = [
      {
        id: "l1",
        name: "Todo",
        position: "1024",
        cards: [
          {
            id: "c1",
            title: "Ship",
            position: "1024",
          },
        ],
      },
      {
        id: "l2",
        name: "Done",
        position: "2048",
        cards: [
          {
            id: "c2",
            title: "Done card",
            position: "1024",
            isCompleted: true,
          },
        ],
      },
    ];

    const flat = flattenBoardCards(lists);
    expect(flat).toHaveLength(2);
    expect(flat[0]).toMatchObject({
      id: "c1",
      listId: "l1",
      listName: "Todo",
    });
    expect(flat[1]).toMatchObject({
      id: "c2",
      listId: "l2",
      listName: "Done",
    });
  });
});
