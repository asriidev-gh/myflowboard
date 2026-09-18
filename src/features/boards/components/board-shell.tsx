"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  BoardCanvas,
  type BoardListModel,
} from "@/features/boards/components/board-canvas";
import {
  BoardFilters,
  EMPTY_BOARD_FILTERS,
  cardMatchesFilters,
  isBoardFiltersActive,
  type BoardFiltersState,
} from "@/features/boards/components/board-filters";
import { BoardViewSwitcher } from "@/features/boards/components/board-view-switcher";
import { CardDetailDialog } from "@/features/cards/components/card-detail-dialog";
import type {
  BoardCardContext,
  CardDetailLabel,
  CardDetailMember,
  CardDetailSeed,
} from "@/features/cards/types";
import {
  flattenBoardCards,
  type BoardViewMode,
} from "@/features/boards/views";

const BoardCalendarView = dynamic(
  () =>
    import("@/features/boards/components/board-calendar-view").then(
      (mod) => mod.BoardCalendarView,
    ),
  {
    loading: () => (
      <div className="p-4 md:p-6" aria-busy="true">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-[28rem] w-full rounded-xl" />
        <span className="sr-only">Loading calendar</span>
      </div>
    ),
  },
);

const BoardTableView = dynamic(
  () =>
    import("@/features/boards/components/board-table-view").then(
      (mod) => mod.BoardTableView,
    ),
  {
    loading: () => (
      <div className="p-4 md:p-6" aria-busy="true">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="mt-3 h-64 w-full rounded-xl" />
        <span className="sr-only">Loading table</span>
      </div>
    ),
  },
);

interface BoardShellProps {
  boardId: string;
  boardName: string;
  workspaceId: string;
  initialLists: BoardListModel[];
  canEdit: boolean;
  currentUserId: string;
  boardLabels: BoardCardContext["boardLabels"];
  workspaceMembers: BoardCardContext["workspaceMembers"];
  initialOpenCardId?: string | null;
  initialView?: BoardViewMode;
}

function shellListsSignature(lists: BoardListModel[]) {
  return lists
    .map(
      (list) =>
        `${list.id}:${list.cards
          .map((card) => {
            const memberIds = (card.members ?? [])
              .map((m) => m.id)
              .sort()
              .join("+");
            return `${card.id}:${card.title}:${card.coverImage ?? ""}:${memberIds}`;
          })
          .join(",")}`,
    )
    .join("|");
}

export function BoardShell({
  boardId,
  boardName,
  workspaceId,
  initialLists,
  canEdit,
  currentUserId,
  boardLabels,
  workspaceMembers,
  initialOpenCardId = null,
  initialView = "board",
}: BoardShellProps) {
  const router = useRouter();
  const [view, setView] = useState<BoardViewMode>(initialView);
  const [filters, setFilters] = useState<BoardFiltersState>(EMPTY_BOARD_FILTERS);
  const serverSig = shellListsSignature(initialLists);
  const [lists, setLists] = useState(initialLists);
  const [appliedSig, setAppliedSig] = useState(serverSig);
  const [openCardId, setOpenCardId] = useState<string | null>(
    initialView !== "board" ? initialOpenCardId : null,
  );

  if (serverSig !== appliedSig) {
    setAppliedSig(serverSig);
    setLists(initialLists);
  }

  const boardContext: BoardCardContext = {
    boardId,
    boardName,
    workspaceId,
    boardLabels,
    workspaceMembers,
  };

  const flatCards = useMemo(() => {
    const flat = flattenBoardCards(lists);
    if (!isBoardFiltersActive(filters)) return flat;
    return flat.filter((card) => cardMatchesFilters(card, filters));
  }, [filters, lists]);

  function cardSeed(cardId: string): CardDetailSeed | null {
    for (const list of lists) {
      const card = list.cards.find((item) => item.id === cardId);
      if (!card) continue;
      return {
        id: card.id,
        title: card.title,
        listId: list.id,
        listName: list.name,
        boardId,
        boardName,
        workspaceId,
        dueDate: card.dueDate,
        isCompleted: card.isCompleted,
        labels: card.labels,
        members: card.members,
      };
    }
    return null;
  }

  function setCardMembers(cardId: string, members: CardDetailMember[]) {
    setLists((prev) =>
      prev.map((list) => ({
        ...list,
        cards: list.cards.map((card) =>
          card.id === cardId ? { ...card, members } : card,
        ),
      })),
    );
  }

  function setCardLabels(cardId: string, labels: CardDetailLabel[]) {
    setLists((prev) =>
      prev.map((list) => ({
        ...list,
        cards: list.cards.map((card) =>
          card.id === cardId ? { ...card, labels } : card,
        ),
      })),
    );
  }

  function setCardTitle(cardId: string, title: string) {
    setLists((prev) =>
      prev.map((list) => ({
        ...list,
        cards: list.cards.map((card) =>
          card.id === cardId ? { ...card, title } : card,
        ),
      })),
    );
  }

  function changeView(next: BoardViewMode) {
    setView(next);
    const params = new URLSearchParams();
    if (next !== "board") params.set("view", next);
    if (openCardId) params.set("card", openCardId);
    const query = params.toString();
    router.replace(query ? `/boards/${boardId}?${query}` : `/boards/${boardId}`, {
      scroll: false,
    });
  }

  function openCard(cardId: string) {
    setOpenCardId(cardId);
    const params = new URLSearchParams();
    if (view !== "board") params.set("view", view);
    params.set("card", cardId);
    router.replace(`/boards/${boardId}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {view !== "board" ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 md:px-6">
          <BoardViewSwitcher value={view} onChange={changeView} />
          <BoardFilters
            filters={filters}
            onChange={setFilters}
            members={workspaceMembers}
            labels={boardLabels}
          />
        </div>
      ) : null}

      {view === "board" ? (
        <BoardCanvas
          boardId={boardId}
          boardName={boardName}
          workspaceId={workspaceId}
          initialLists={initialLists}
          canEdit={canEdit}
          currentUserId={currentUserId}
          boardLabels={boardLabels}
          workspaceMembers={workspaceMembers}
          initialOpenCardId={
            initialView === "board" ? initialOpenCardId : null
          }
          toolbarStart={
            <BoardViewSwitcher value={view} onChange={changeView} />
          }
        />
      ) : null}

      {view === "calendar" ? (
        <BoardCalendarView cards={flatCards} onOpenCard={openCard} />
      ) : null}

      {view === "table" ? (
        <BoardTableView cards={flatCards} onOpenCard={openCard} />
      ) : null}

      {view !== "board" && openCardId ? (
        <CardDetailDialog
          cardId={openCardId}
          canEdit={canEdit}
          currentUserId={currentUserId}
          open={!!openCardId}
          seed={cardSeed(openCardId)}
          boardContext={boardContext}
          onMembersChange={setCardMembers}
          onLabelsChange={setCardLabels}
          onTitleChange={setCardTitle}
          onOpenChange={(next) => {
            if (!next) {
              setOpenCardId(null);
              const params = new URLSearchParams();
              params.set("view", view);
              router.replace(`/boards/${boardId}?${params.toString()}`, {
                scroll: false,
              });
            }
          }}
        />
      ) : null}
    </div>
  );
}
