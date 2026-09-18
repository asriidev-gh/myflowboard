import { describe, expect, it } from "vitest";

import {
  initialPosition,
  positionAfter,
  positionBetween,
  resolveInsertPosition,
  sortByPosition,
  tryPositionBetween,
} from "@/lib/ordering/position";

describe("position ordering", () => {
  it("starts and appends with spacing", () => {
    expect(initialPosition()).toBe("1024");
    expect(positionAfter(null)).toBe("1024");
    expect(positionAfter("1024")).toBe("2048");
  });

  it("inserts between neighbors", () => {
    expect(positionBetween("1024", "2048")).toBe("1536");
    expect(positionBetween(null, "1024")).toBe("512");
    expect(positionBetween("2048", null)).toBe("3072");
  });

  it("signals exhausted gaps", () => {
    expect(tryPositionBetween("1", "2")).toBeNull();
  });

  it("rebalances when inserting into a tight gap", () => {
    const result = resolveInsertPosition({
      orderedIds: ["a", "b", "c"],
      positions: { a: "1", b: "2", c: "3" },
      itemId: "x",
      beforeId: "a",
      afterId: "b",
    });
    expect(result.kind).toBe("rebalance");
    if (result.kind === "rebalance") {
      expect(result.positions.map((p) => p.id)).toEqual(["a", "x", "b", "c"]);
      expect(result.positions[0]?.position).toBe("1024");
    }
  });

  it("sorts by numeric position", () => {
    const sorted = sortByPosition([
      { id: "c", position: "3072" },
      { id: "a", position: "1024" },
      { id: "b", position: "2048" },
    ]);
    expect(sorted.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
});
