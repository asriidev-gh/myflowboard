"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Plus, Trash2, X } from "lucide-react";
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type ClipboardEvent,
  type ReactNode,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  archiveCardAction,
  archiveListAction,
  createCardAction,
  createListAction,
  reorderCardAction,
  reorderListAction,
  updateListAction,
} from "@/features/boards/actions";
import {
  createCardSchema,
  createListSchema,
  updateListSchema,
  type CreateCardInput,
  type CreateListInput,
  type UpdateListInput,
} from "@/features/boards/schemas";
import {
  BoardFilters,
  EMPTY_BOARD_FILTERS,
  cardMatchesFilters,
  isBoardFiltersActive,
  type BoardFiltersState,
} from "@/features/boards/components/board-filters";
import { uploadAttachmentAction } from "@/features/cards/actions";
import { CardDetailDialog } from "@/features/cards/components/card-detail-dialog";
import { fetchCardDetail } from "@/features/cards/fetch-card-detail";
import {
  formatDueDate,
  getDueVisualState,
} from "@/features/cards/due-date";
import {
  cardDetailQueryKey,
  type BoardCardContext,
  type CardDetailSeed,
} from "@/features/cards/types";
import { MAX_UPLOAD_BYTES } from "@/lib/storage/types";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export type BoardCardModel = {
  id: string;
  title: string;
  position: string;
  dueDate?: string | Date | null;
  isCompleted?: boolean;
  coverImage?: string | null;
  labels?: { id: string; name: string; color: string }[];
  members?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  }[];
};

export type BoardListModel = {
  id: string;
  name: string;
  position: string;
  cards: BoardCardModel[];
};

type ActiveDrag =
  | { type: "list"; list: BoardListModel }
  | { type: "card"; card: BoardCardModel; listId: string };

interface BoardCanvasProps {
  boardId: string;
  boardName: string;
  workspaceId: string;
  initialLists: BoardListModel[];
  canEdit: boolean;
  currentUserId: string;
  boardLabels: BoardCardContext["boardLabels"];
  workspaceMembers: BoardCardContext["workspaceMembers"];
  initialOpenCardId?: string | null;
  toolbarStart?: ReactNode;
}

function neighbors(ids: string[], index: number) {
  return {
    beforeId: index > 0 ? (ids[index - 1] ?? null) : null,
    afterId: index < ids.length - 1 ? (ids[index + 1] ?? null) : null,
  };
}

function findListId(
  lists: BoardListModel[],
  id: UniqueIdentifier,
): string | undefined {
  const asString = String(id);
  if (lists.some((list) => list.id === asString)) return asString;
  return lists.find((list) => list.cards.some((card) => card.id === asString))
    ?.id;
}

const emptySubscribe = () => () => undefined;

function listsSignature(lists: BoardListModel[]) {
  return lists
    .map(
      (list) =>
        `${list.id}:${list.position}:${list.cards
          .map((card) => {
            const memberIds = (card.members ?? [])
              .map((m) => m.id)
              .sort()
              .join("+");
            const labelIds = (card.labels ?? [])
              .map((l) => l.id)
              .sort()
              .join("+");
            return `${card.id}:${card.position}:${card.isCompleted ? 1 : 0}:${card.title}:${card.coverImage ?? ""}:${memberIds}:${labelIds}`;
          })
          .join(",")}`,
    )
    .join("|");
}

function CardCoverImage({ src }: { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- authenticated attachment URLs
    <img
      src={src}
      alt=""
      className="h-28 w-full bg-muted object-cover"
    />
  );
}

/** False on the server and during hydration; true only after client mount. */
function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function BoardCanvas({
  boardId,
  boardName,
  workspaceId,
  initialLists,
  canEdit,
  currentUserId,
  boardLabels,
  workspaceMembers,
  initialOpenCardId = null,
  toolbarStart,
}: BoardCanvasProps) {
  const isClient = useIsClient();
  const queryClient = useQueryClient();
  const serverSig = listsSignature(initialLists);
  const [lists, setLists] = useState(initialLists);
  const [appliedSig, setAppliedSig] = useState(serverSig);
  const [active, setActive] = useState<ActiveDrag | null>(null);
  const [pending, startTransition] = useTransition();
  const [openCardId, setOpenCardId] = useState<string | null>(
    initialOpenCardId,
  );
  const [filters, setFilters] = useState<BoardFiltersState>(EMPTY_BOARD_FILTERS);
  const listsRef = useRef(initialLists);
  const dragStartListsRef = useRef(initialLists);

  // Keep local board state in sync with server refreshes without remounting.
  if (serverSig !== appliedSig) {
    setAppliedSig(serverSig);
    setLists(initialLists);
  }

  useLayoutEffect(() => {
    listsRef.current = lists;
  }, [lists]);

  const boardContext: BoardCardContext = {
    boardId,
    boardName,
    workspaceId,
    boardLabels,
    workspaceMembers,
  };

  const visibleLists = useMemo(() => {
    if (!isBoardFiltersActive(filters)) return lists;
    return lists.map((list) => ({
      ...list,
      cards: list.cards.filter((card) => cardMatchesFilters(card, filters)),
    }));
  }, [lists, filters]);

  function commitLists(next: BoardListModel[]) {
    listsRef.current = next;
    setLists(next);
  }

  function addCardToList(listId: string, card: BoardCardModel) {
    const current = listsRef.current;
    commitLists(
      current.map((list) =>
        list.id === listId
          ? {
              ...list,
              cards: list.cards.some((c) => c.id === card.id)
                ? list.cards
                : [...list.cards, card],
            }
          : list,
      ),
    );
  }

  function addList(list: BoardListModel) {
    const current = listsRef.current;
    if (current.some((l) => l.id === list.id)) return;
    commitLists([...current, list]);
  }

  function archiveCard(cardId: string) {
    const previous = listsRef.current;
    commitLists(
      previous.map((list) => ({
        ...list,
        cards: list.cards.filter((card) => card.id !== cardId),
      })),
    );
    if (openCardId === cardId) setOpenCardId(null);

    startTransition(async () => {
      const result = await archiveCardAction({ cardId });
      if (!result.ok) {
        commitLists(previous);
        toast.error(result.error);
        return;
      }
      toast.success("Card archived");
    });
  }

  function prefetchCard(cardId: string) {
    void queryClient.prefetchQuery({
      queryKey: cardDetailQueryKey(cardId),
      queryFn: () => fetchCardDetail(cardId),
      staleTime: 30_000,
    });
  }

  function openCard(cardId: string) {
    prefetchCard(cardId);
    setOpenCardId(cardId);
  }

  function cardSeed(cardId: string): CardDetailSeed | null {
    for (const list of lists) {
      const card = list.cards.find((c) => c.id === cardId);
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

  function setCardMembers(
    cardId: string,
    members: NonNullable<BoardCardModel["members"]>,
  ) {
    setLists((prev) =>
      prev.map((list) => ({
        ...list,
        cards: list.cards.map((card) =>
          card.id === cardId ? { ...card, members } : card,
        ),
      })),
    );
  }

  function setCardLabels(
    cardId: string,
    labels: NonNullable<BoardCardModel["labels"]>,
  ) {
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const listIds = useMemo(() => lists.map((list) => list.id), [lists]);

  function onDragStart(event: DragStartEvent) {
    dragStartListsRef.current = listsRef.current;
    const data = event.active.data.current as
      | { type: "list"; list: BoardListModel }
      | { type: "card"; card: BoardCardModel; listId: string }
      | undefined;

    if (!data) return;
    if (data.type === "list") {
      setActive({ type: "list", list: data.list });
    } else {
      setActive({ type: "card", card: data.card, listId: data.listId });
    }
  }

  function onDragOver(event: DragOverEvent) {
    const { active: dragActive, over } = event;
    if (!over || dragActive.id === over.id) return;

    const activeType = dragActive.data.current?.type;
    if (activeType !== "card") return;

    const activeListId = findListId(lists, dragActive.id);
    const overListId = findListId(lists, over.id);
    if (!activeListId || !overListId || activeListId === overListId) return;

    setLists((prev) => {
      const sourceIndex = prev.findIndex((list) => list.id === activeListId);
      const destIndex = prev.findIndex((list) => list.id === overListId);
      if (sourceIndex < 0 || destIndex < 0) return prev;

      const sourceList = prev[sourceIndex];
      const destList = prev[destIndex];
      if (!sourceList || !destList) return prev;

      const cardIndex = sourceList.cards.findIndex(
        (card) => card.id === String(dragActive.id),
      );
      if (cardIndex < 0) return prev;

      const moving = sourceList.cards[cardIndex];
      if (!moving) return prev;

      const overIsList = destList.id === String(over.id);
      let insertIndex = destList.cards.length;
      if (!overIsList) {
        const overCardIndex = destList.cards.findIndex(
          (card) => card.id === String(over.id),
        );
        insertIndex = overCardIndex >= 0 ? overCardIndex : destList.cards.length;
      }

      const nextSourceCards = sourceList.cards.filter(
        (card) => card.id !== moving.id,
      );
      const nextDestCards = [...destList.cards];
      nextDestCards.splice(insertIndex, 0, moving);

      const next = [...prev];
      next[sourceIndex] = { ...sourceList, cards: nextSourceCards };
      next[destIndex] = { ...destList, cards: nextDestCards };
      listsRef.current = next;
      return next;
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active: dragActive, over } = event;
    setActive(null);
    if (!over || !canEdit) return;

    const activeType = dragActive.data.current?.type as
      | "list"
      | "card"
      | undefined;
    if (!activeType) return;

    const currentLists = listsRef.current;

    if (activeType === "list") {
      const oldIndex = currentLists.findIndex(
        (list) => list.id === String(dragActive.id),
      );
      let newIndex = currentLists.findIndex(
        (list) => list.id === String(over.id),
      );
      if (newIndex < 0) {
        const overListId = findListId(currentLists, over.id);
        newIndex = currentLists.findIndex((list) => list.id === overListId);
      }
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

      const previous = currentLists;
      const next = arrayMove(currentLists, oldIndex, newIndex);
      commitLists(next);

      const ids = next.map((list) => list.id);
      const { beforeId, afterId } = neighbors(ids, newIndex);

      startTransition(async () => {
        const result = await reorderListAction({
          boardId,
          listId: String(dragActive.id),
          beforeListId: beforeId,
          afterListId: afterId,
        });
        if (!result.ok) {
          commitLists(previous);
          toast.error(result.error);
        }
      });
      return;
    }

    const previous = currentLists;
    let working = currentLists;

    const activeListId = findListId(working, dragActive.id);
    const overListId = findListId(working, over.id);
    if (!activeListId || !overListId) return;

    // Same-list reorder
    if (activeListId === overListId && String(over.id) !== overListId) {
      const listIndex = working.findIndex((list) => list.id === activeListId);
      const list = working[listIndex];
      if (!list) return;
      const fromIndex = list.cards.findIndex(
        (card) => card.id === String(dragActive.id),
      );
      const toIndex = list.cards.findIndex(
        (card) => card.id === String(over.id),
      );
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
        // Still persist current order (no-op safe)
      } else {
        const reorderedCards = arrayMove(list.cards, fromIndex, toIndex);
        working = working.map((item, index) =>
          index === listIndex ? { ...item, cards: reorderedCards } : item,
        );
        commitLists(working);
      }
    }

    const targetList = working.find((list) => list.id === overListId);
    if (!targetList) return;
    const cardIndex = targetList.cards.findIndex(
      (card) => card.id === String(dragActive.id),
    );
    if (cardIndex < 0) return;

    const ids = targetList.cards.map((card) => card.id);
    const { beforeId, afterId } = neighbors(ids, cardIndex);

    startTransition(async () => {
      const result = await reorderCardAction({
        cardId: String(dragActive.id),
        targetListId: overListId,
        beforeCardId: beforeId,
        afterCardId: afterId,
      });
      if (!result.ok) {
        commitLists(previous);
        toast.error(result.error);
      }
    });
  }

  // Avoid dnd-kit ID mismatches during hydration: render a static board
  // on the server and first client paint, then enable DnD after mount.
  if (!isClient || !canEdit) {
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 md:px-6">
          <div className="flex items-center gap-2">{toolbarStart}</div>
          <BoardFilters
            filters={filters}
            onChange={setFilters}
            members={workspaceMembers}
            labels={boardLabels}
          />
        </div>
        <div className="flex flex-1 gap-3 overflow-x-auto p-4 md:p-6">
          {visibleLists.map((list) => (
            <StaticList
              key={list.id}
              list={list}
              canEdit={canEdit}
              onOpenCard={openCard}
              onPrefetchCard={prefetchCard}
              onCardCreated={addCardToList}
            />
          ))}
          {canEdit ? (
            <AddListForm boardId={boardId} onCreated={addList} />
          ) : null}
          {!canEdit && visibleLists.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This board has no lists yet.
            </p>
          ) : null}
        </div>
        {openCardId ? (
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
              if (!next) setOpenCardId(null);
            }}
          />
        ) : null}
      </>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActive(null);
        commitLists(dragStartListsRef.current);
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 md:px-6">
        <div className="flex items-center gap-2">{toolbarStart}</div>
        <BoardFilters
          filters={filters}
          onChange={setFilters}
          members={workspaceMembers}
          labels={boardLabels}
        />
      </div>
      <div
        className={cn(
          "flex flex-1 gap-3 overflow-x-auto p-4 md:p-6",
          pending && "opacity-95",
        )}
      >
        <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
          {visibleLists.map((list) => (
            <SortableListColumn
              key={list.id}
              list={list}
              onOpenCard={openCard}
              onPrefetchCard={prefetchCard}
              onCardCreated={addCardToList}
              onArchiveCard={archiveCard}
            />
          ))}
        </SortableContext>
        <AddListForm boardId={boardId} onCreated={addList} />
      </div>

      <DragOverlay dropAnimation={null}>
        {active?.type === "list" ? (
          <div className="w-72 rounded-xl bg-muted/80 p-3 opacity-90 shadow-lg ring-1 ring-border">
            <p className="text-sm font-semibold">{active.list.name}</p>
            <p className="text-xs text-muted-foreground">
              {active.list.cards.length} cards
            </p>
          </div>
        ) : null}
        {active?.type === "card" ? (
          <div className="w-64 overflow-hidden rounded-lg border bg-card shadow-lg">
            {active.card.coverImage ? (
              <CardCoverImage src={active.card.coverImage} />
            ) : null}
            <p className="p-2.5 text-sm">{active.card.title}</p>
          </div>
        ) : null}
      </DragOverlay>

      {openCardId ? (
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
            if (!next) setOpenCardId(null);
          }}
        />
      ) : null}
    </DndContext>
  );
}

function StaticList({
  list,
  canEdit,
  onOpenCard,
  onPrefetchCard,
  onCardCreated,
}: {
  list: BoardListModel;
  canEdit: boolean;
  onOpenCard: (cardId: string) => void;
  onPrefetchCard: (cardId: string) => void;
  onCardCreated: (listId: string, card: BoardCardModel) => void;
}) {
  return (
    <section className="flex w-72 shrink-0 flex-col rounded-xl bg-muted/50 ring-1 ring-border/60">
      <header className="px-3 pt-3 pb-2 text-sm font-semibold">{list.name}</header>
      <div className="flex max-h-[calc(100vh-14rem)] flex-col gap-2 overflow-y-auto px-2 pb-2">
        {list.cards.map((card) => {
          const dueState = getDueVisualState(card.dueDate, !!card.isCompleted);
          return (
            <button
              key={card.id}
              type="button"
              className="cursor-pointer overflow-hidden rounded-lg border bg-card text-left shadow-sm"
              onPointerEnter={() => onPrefetchCard(card.id)}
              onFocus={() => onPrefetchCard(card.id)}
              onClick={() => onOpenCard(card.id)}
            >
              {card.coverImage ? <CardCoverImage src={card.coverImage} /> : null}
              <div className="p-2.5">
              {card.labels && card.labels.length > 0 ? (
                <div className="mb-1.5 flex flex-wrap gap-1">
                  {card.labels.map((label) => (
                    <span
                      key={label.id}
                      className="h-1.5 w-8 rounded-full"
                      style={{ backgroundColor: label.color }}
                      title={label.name}
                    />
                  ))}
                </div>
              ) : null}
              <p className="text-sm">{card.title}</p>
              {card.dueDate ? (
                <span
                  className={cn(
                    "mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium",
                    dueState === "overdue" &&
                      "bg-destructive/15 text-destructive",
                    dueState === "soon" &&
                      "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                    dueState === "completed" &&
                      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                    dueState === "normal" && "bg-muted text-muted-foreground",
                  )}
                >
                  {formatDueDate(card.dueDate)}
                </span>
              ) : null}
              </div>
            </button>
          );
        })}
      </div>
      {canEdit ? (
        <AddCardForm listId={list.id} onCreated={onCardCreated} />
      ) : null}
    </section>
  );
}

function SortableListColumn({
  list,
  onOpenCard,
  onPrefetchCard,
  onCardCreated,
  onArchiveCard,
}: {
  list: BoardListModel;
  onOpenCard: (cardId: string) => void;
  onPrefetchCard: (cardId: string) => void;
  onCardCreated: (listId: string, card: BoardCardModel) => void;
  onArchiveCard: (cardId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    data: { type: "list", list },
  });

  const { setNodeRef: setDropRef } = useDroppable({
    id: list.id,
    data: { type: "list", list },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <section
      ref={(node) => {
        setNodeRef(node);
        setDropRef(node);
      }}
      style={style}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl bg-muted/50 ring-1 ring-border/60",
        isDragging && "opacity-40",
      )}
    >
      <header className="flex items-start justify-between gap-1 px-2 pt-3 pb-2">
        <button
          type="button"
          className="mt-0.5 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          aria-label="Drag list"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <ListTitle listId={list.id} name={list.name} canEdit />
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
            )}
            aria-label="List menu"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem
                variant="destructive"
                onClick={async () => {
                  const result = await archiveListAction({ listId: list.id });
                  if (!result.ok) toast.error(result.error);
                  else toast.success("List archived");
                }}
              >
                Archive list
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <SortableContext
        items={list.cards.map((card) => card.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex max-h-[calc(100vh-14rem)] flex-col gap-2 overflow-y-auto px-2 pb-2">
          {list.cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              listId={list.id}
              onOpen={() => onOpenCard(card.id)}
              onPrefetch={() => onPrefetchCard(card.id)}
              onArchive={() => onArchiveCard(card.id)}
            />
          ))}
        </div>
      </SortableContext>

      <AddCardForm listId={list.id} onCreated={onCardCreated} />
    </section>
  );
}

function SortableCard({
  card,
  listId,
  onOpen,
  onPrefetch,
  onArchive,
}: {
  card: BoardCardModel;
  listId: string;
  onOpen: () => void;
  onPrefetch: () => void;
  onArchive: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const dueState = getDueVisualState(card.dueDate, !!card.isCompleted);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: "card", card, listId },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <>
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-pointer overflow-hidden rounded-lg border bg-card shadow-sm",
        isDragging && "opacity-40",
      )}
      onPointerEnter={onPrefetch}
    >
      {card.coverImage ? <CardCoverImage src={card.coverImage} /> : null}
      <div className="p-2.5">
      <div className="flex items-start gap-1">
        <button
          type="button"
          className="mt-0.5 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          aria-label="Drag card"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>
        <button
          type="button"
          className="min-w-0 flex-1 cursor-pointer space-y-1.5 text-left"
          onClick={onOpen}
          onFocus={onPrefetch}
        >
          {card.labels && card.labels.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {card.labels.map((label) => (
                <span
                  key={label.id}
                  className="h-1.5 w-8 rounded-full"
                  style={{ backgroundColor: label.color }}
                  title={label.name}
                />
              ))}
            </div>
          ) : null}
          <p className="text-sm">{card.title}</p>
          <div className="flex flex-wrap items-center gap-2">
            {card.dueDate ? (
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-medium",
                  dueState === "overdue" &&
                    "bg-destructive/15 text-destructive",
                  dueState === "soon" &&
                    "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                  dueState === "completed" &&
                    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                  dueState === "normal" && "bg-muted text-muted-foreground",
                )}
              >
                {formatDueDate(card.dueDate)}
              </span>
            ) : null}
            {card.members && card.members.length > 0 ? (
              <div className="ml-auto flex -space-x-1.5">
                {card.members.slice(0, 3).map((member) => (
                  <span
                    key={member.id}
                    className="flex size-5 items-center justify-center rounded-full bg-muted text-[9px] font-medium ring-1 ring-background"
                    title={member.name ?? member.email}
                  >
                    {(member.name ?? member.email).slice(0, 1).toUpperCase()}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          aria-label="Archive card"
          title="Archive"
          onClick={(event) => {
            event.stopPropagation();
            setConfirmOpen(true);
          }}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      </div>
    </article>

    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Archive card?</DialogTitle>
          <DialogDescription>
            Archive <strong>{card.title}</strong>? It will be removed from this
            board list.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setConfirmOpen(false);
              onArchive();
            }}
          >
            Archive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function ListTitle({
  listId,
  name,
  canEdit,
}: {
  listId: string;
  name: string;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<UpdateListInput>({
    resolver: zodResolver(updateListSchema),
    defaultValues: { listId, name },
  });

  if (!canEdit || !editing) {
    return (
      <button
        type="button"
        className="min-w-0 flex-1 text-left text-sm font-semibold"
        onClick={() => canEdit && setEditing(true)}
      >
        {name}
      </button>
    );
  }

  return (
    <form
      className="min-w-0 flex-1"
      onSubmit={form.handleSubmit((values) => {
        startTransition(async () => {
          const result = await updateListAction(values);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          setEditing(false);
        });
      })}
    >
      <Input
        autoFocus
        className="h-7"
        disabled={pending}
        {...form.register("name")}
        onBlur={() => setEditing(false)}
      />
    </form>
  );
}

function AddCardForm({
  listId,
  onCreated,
}: {
  listId: string;
  onCreated: (listId: string, card: BoardCardModel) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [pastedImage, setPastedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const form = useForm<CreateCardInput>({
    resolver: zodResolver(createCardSchema),
    defaultValues: { listId, title: "" },
  });

  function replacePastedImage(file: File | null) {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    setPastedImage(file);
  }

  function clearPastedImage() {
    replacePastedImage(null);
  }

  function handlePaste(event: ClipboardEvent<HTMLFormElement>) {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (!item.type.startsWith("image/")) continue;
      const file = item.getAsFile();
      if (!file) continue;

      event.preventDefault();

      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error("Image exceeds the 10 MB size limit.");
        return;
      }

      const extension = file.type.split("/")[1] || "png";
      const named =
        file.name && file.name !== "image.png"
          ? file
          : new File([file], `pasted-image.${extension}`, {
              type: file.type,
              lastModified: file.lastModified,
            });

      replacePastedImage(named);
      if (!form.getValues("title").trim()) {
        form.setValue("title", "Pasted image", {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
      toast.success("Image ready to attach");
      return;
    }
  }

  function closeForm() {
    clearPastedImage();
    form.reset({ listId, title: "" });
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        className="m-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-background/80 hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        Add card
      </button>
    );
  }

  return (
    <form
      className="m-2 space-y-2"
      onPaste={handlePaste}
      onSubmit={form.handleSubmit((values) => {
        startTransition(async () => {
          const title = values.title.trim() || (pastedImage ? "Pasted image" : "");
          if (!title) {
            toast.error("Title is required");
            return;
          }

          const result = await createCardAction({
            listId: values.listId,
            title,
          });
          if (!result.ok) {
            toast.error(result.error);
            return;
          }

          let coverImage: string | null = null;
          if (result.id && pastedImage) {
            const body = new FormData();
            body.set("cardId", result.id);
            body.set("file", pastedImage);
            const upload = await uploadAttachmentAction(body);
            if (!upload.ok) {
              toast.error(
                upload.error ||
                  "Card created, but the image could not be attached.",
              );
            } else if (upload.id) {
              coverImage = `/api/attachments/${upload.id}`;
            }
          }

          if (result.id && result.position) {
            onCreated(listId, {
              id: result.id,
              title,
              position: result.position,
              coverImage,
              labels: [],
              members: [],
            });
          }
          clearPastedImage();
          form.reset({ listId, title: "" });
          setOpen(false);
        });
      })}
    >
      <Input
        autoFocus
        placeholder="Card title — or paste an image"
        {...form.register("title")}
      />
      {previewUrl && pastedImage ? (
        <div className="relative overflow-hidden rounded-lg border bg-muted/40">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
          <img
            src={previewUrl}
            alt="Pasted preview"
            className="max-h-36 w-full object-contain"
          />
          <button
            type="button"
            className="absolute top-1.5 right-1.5 rounded-full bg-background/90 p-1 text-muted-foreground shadow-sm hover:text-foreground"
            aria-label="Remove pasted image"
            onClick={clearPastedImage}
          >
            <X className="size-3.5" />
          </button>
          <p className="truncate px-2 py-1 text-xs text-muted-foreground">
            {pastedImage.name}
          </p>
        </div>
      ) : (
        <p className="px-0.5 text-xs text-muted-foreground">
          Tip: paste (Ctrl/⌘+V) an image to attach it.
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Adding…" : "Add"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={closeForm}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function AddListForm({
  boardId,
  onCreated,
}: {
  boardId: string;
  onCreated?: (list: BoardListModel) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<CreateListInput>({
    resolver: zodResolver(createListSchema),
    defaultValues: { boardId, name: "" },
  });

  if (!open) {
    return (
      <button
        type="button"
        className="flex h-fit w-72 shrink-0 items-center gap-1.5 rounded-xl bg-muted/40 px-3 py-3 text-sm text-muted-foreground ring-1 ring-border/50 hover:bg-muted/70 hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        Add list
      </button>
    );
  }

  return (
    <form
      className="flex w-72 shrink-0 flex-col gap-2 rounded-xl bg-muted/50 p-3 ring-1 ring-border/60"
      onSubmit={form.handleSubmit((values) => {
        startTransition(async () => {
          const result = await createListAction(values);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          if (result.id && result.position && onCreated) {
            onCreated({
              id: result.id,
              name: values.name.trim(),
              position: result.position,
              cards: [],
            });
          }
          form.reset({ boardId, name: "" });
          setOpen(false);
        });
      })}
    >
      <Input autoFocus placeholder="List name" {...form.register("name")} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Adding…" : "Add list"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
