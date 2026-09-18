import type {
  BoardCardModel,
  BoardListModel,
} from "@/features/boards/components/board-canvas";

export type BoardViewMode = "board" | "calendar" | "table";

export type FlatBoardCard = BoardCardModel & {
  listId: string;
  listName: string;
};

export function parseBoardViewMode(value: string | undefined): BoardViewMode {
  if (value === "calendar" || value === "table") return value;
  return "board";
}

export function flattenBoardCards(lists: BoardListModel[]): FlatBoardCard[] {
  return lists.flatMap((list) =>
    list.cards.map((card) => ({
      ...card,
      listId: list.id,
      listName: list.name,
    })),
  );
}
