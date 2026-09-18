"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  canEditBoardContent,
  canManageWorkspace,
  canViewWorkspace,
} from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { positionAfter, resolveInsertPosition } from "@/lib/ordering/position";
import {
  boardIdSchema,
  cardIdSchema,
  createBoardSchema,
  createCardSchema,
  createListSchema,
  listIdSchema,
  moveCardSchema,
  reorderCardSchema,
  reorderListSchema,
  updateBoardSchema,
  updateCardSchema,
  updateListSchema,
} from "@/features/boards/schemas";
import {
  getWorkspaceMembership,
  requireBoardAccess,
  requireUserId,
} from "@/features/boards/queries";

export type ActionResult =
  | { ok: true; message?: string; id?: string; position?: string }
  | { ok: false; error: string };

const DEFAULT_LISTS = ["Backlog", "To Do", "In Progress", "Done"];

const DEFAULT_LABELS = [
  { name: "Frontend", color: "#0f766e" },
  { name: "Backend", color: "#0369a1" },
  { name: "Bug", color: "#dc2626" },
  { name: "Feature", color: "#7c3aed" },
  { name: "Urgent", color: "#ea580c" },
];

function revalidateBoard(boardId: string, workspaceId: string) {
  revalidatePath(`/boards/${boardId}`);
  revalidatePath("/boards");
  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath("/dashboard");
}

async function authUser(): Promise<ActionResult | { userId: string }> {
  try {
    return { userId: await requireUserId() };
  } catch {
    return { ok: false, error: "You must be signed in." };
  }
}

export async function createBoardAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = createBoardSchema.safeParse({
    ...(input as object),
    withDefaultLists:
      (input as { withDefaultLists?: boolean })?.withDefaultLists ?? true,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const membership = await getWorkspaceMembership(
    parsed.data.workspaceId,
    auth.userId,
  );
  if (!membership || !canEditBoardContent(membership.role)) {
    return { ok: false, error: "You cannot create boards in this workspace." };
  }

  const name = parsed.data.name.trim();
  const description = parsed.data.description?.trim() || null;

  const board = await prisma.board.create({
    data: {
      workspaceId: parsed.data.workspaceId,
      name,
      description,
      createdById: auth.userId,
      members: {
        create: { userId: auth.userId, role: "admin" },
      },
      lists: parsed.data.withDefaultLists
        ? {
            create: DEFAULT_LISTS.map((listName, index) => ({
              name: listName,
              position: String((index + 1) * 1024),
            })),
          }
        : undefined,
      labels: {
        create: DEFAULT_LABELS,
      },
    },
  });

  await prisma.activity.create({
    data: {
      workspaceId: parsed.data.workspaceId,
      boardId: board.id,
      actorId: auth.userId,
      action: "CREATED",
      entityType: "board",
      entityId: board.id,
      metadata: { name },
    },
  });

  revalidateBoard(board.id, parsed.data.workspaceId);
  return { ok: true, id: board.id, message: "Board created." };
}

export async function updateBoardAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = updateBoardSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  let access;
  try {
    access = await requireBoardAccess(parsed.data.boardId, auth.userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canEditBoardContent(access.role)) {
    return { ok: false, error: "You cannot edit this board." };
  }

  const name = parsed.data.name.trim();
  const description = parsed.data.description?.trim() || null;

  await prisma.$transaction([
    prisma.board.update({
      where: { id: parsed.data.boardId },
      data: { name, description },
    }),
    prisma.activity.create({
      data: {
        workspaceId: access.workspaceId,
        boardId: parsed.data.boardId,
        actorId: auth.userId,
        action: "UPDATED",
        entityType: "board",
        entityId: parsed.data.boardId,
        metadata: { name },
      },
    }),
  ]);

  revalidateBoard(parsed.data.boardId, access.workspaceId);
  return { ok: true, message: "Board updated." };
}

export async function deleteBoardAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = boardIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid board." };
  }

  let access;
  try {
    access = await requireBoardAccess(parsed.data.boardId, auth.userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canManageWorkspace(access.role)) {
    return { ok: false, error: "Only owners and admins can delete boards." };
  }

  const workspaceId = access.workspaceId;
  await prisma.board.delete({ where: { id: parsed.data.boardId } });

  revalidatePath("/boards");
  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath("/dashboard");
  redirect(`/workspaces/${workspaceId}`);
}

export async function toggleBoardStarAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = boardIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid board." };
  }

  let access;
  try {
    access = await requireBoardAccess(parsed.data.boardId, auth.userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canViewWorkspace(access.role)) {
    return { ok: false, error: "Access denied." };
  }

  const existing = await prisma.boardStar.findUnique({
    where: {
      boardId_userId: {
        boardId: parsed.data.boardId,
        userId: auth.userId,
      },
    },
  });

  if (existing) {
    await prisma.boardStar.delete({ where: { id: existing.id } });
  } else {
    await prisma.boardStar.create({
      data: { boardId: parsed.data.boardId, userId: auth.userId },
    });
  }

  revalidateBoard(parsed.data.boardId, access.workspaceId);
  return { ok: true, message: existing ? "Unstarred." : "Starred." };
}

export async function createListAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = createListSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  let access;
  try {
    access = await requireBoardAccess(parsed.data.boardId, auth.userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canEditBoardContent(access.role)) {
    return { ok: false, error: "You cannot add lists to this board." };
  }

  const last = await prisma.list.findFirst({
    where: { boardId: parsed.data.boardId, isArchived: false },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const list = await prisma.list.create({
    data: {
      boardId: parsed.data.boardId,
      name: parsed.data.name.trim(),
      position: positionAfter(last?.position),
    },
  });

  await prisma.activity.create({
    data: {
      workspaceId: access.workspaceId,
      boardId: parsed.data.boardId,
      actorId: auth.userId,
      action: "CREATED",
      entityType: "list",
      entityId: list.id,
      metadata: { name: list.name },
    },
  });

  revalidateBoard(parsed.data.boardId, access.workspaceId);
  return {
    ok: true,
    id: list.id,
    position: list.position,
    message: "List created.",
  };
}

export async function updateListAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = updateListSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const list = await prisma.list.findUnique({
    where: { id: parsed.data.listId },
    select: { id: true, boardId: true, isArchived: true },
  });
  if (!list || list.isArchived) {
    return { ok: false, error: "List not found." };
  }

  let access;
  try {
    access = await requireBoardAccess(list.boardId, auth.userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canEditBoardContent(access.role)) {
    return { ok: false, error: "You cannot rename this list." };
  }

  await prisma.list.update({
    where: { id: list.id },
    data: { name: parsed.data.name.trim() },
  });

  revalidateBoard(list.boardId, access.workspaceId);
  return { ok: true, message: "List updated." };
}

export async function archiveListAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = listIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid list." };
  }

  const list = await prisma.list.findUnique({
    where: { id: parsed.data.listId },
    select: { id: true, boardId: true },
  });
  if (!list) return { ok: false, error: "List not found." };

  let access;
  try {
    access = await requireBoardAccess(list.boardId, auth.userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canEditBoardContent(access.role)) {
    return { ok: false, error: "You cannot archive this list." };
  }

  await prisma.$transaction([
    prisma.list.update({
      where: { id: list.id },
      data: { isArchived: true },
    }),
    prisma.activity.create({
      data: {
        workspaceId: access.workspaceId,
        boardId: list.boardId,
        actorId: auth.userId,
        action: "ARCHIVED",
        entityType: "list",
        entityId: list.id,
      },
    }),
  ]);

  revalidateBoard(list.boardId, access.workspaceId);
  return { ok: true, message: "List archived." };
}

export async function createCardAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = createCardSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const list = await prisma.list.findFirst({
    where: { id: parsed.data.listId, isArchived: false },
    select: { id: true, boardId: true, name: true },
  });
  if (!list) return { ok: false, error: "List not found." };

  let access;
  try {
    access = await requireBoardAccess(list.boardId, auth.userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canEditBoardContent(access.role)) {
    return { ok: false, error: "You cannot add cards to this board." };
  }

  const last = await prisma.card.findFirst({
    where: { listId: list.id, isArchived: false },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const title = parsed.data.title.trim();
  const card = await prisma.card.create({
    data: {
      listId: list.id,
      title,
      position: positionAfter(last?.position),
      createdById: auth.userId,
    },
  });

  await prisma.activity.create({
    data: {
      workspaceId: access.workspaceId,
      boardId: list.boardId,
      cardId: card.id,
      actorId: auth.userId,
      action: "CREATED",
      entityType: "card",
      entityId: card.id,
      metadata: { title, listName: list.name },
    },
  });

  revalidateBoard(list.boardId, access.workspaceId);
  return {
    ok: true,
    id: card.id,
    position: card.position,
    message: "Card created.",
  };
}

export async function updateCardAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = updateCardSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const card = await prisma.card.findFirst({
    where: { id: parsed.data.cardId, isArchived: false },
    include: { list: { select: { boardId: true } } },
  });
  if (!card) return { ok: false, error: "Card not found." };

  let access;
  try {
    access = await requireBoardAccess(card.list.boardId, auth.userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canEditBoardContent(access.role)) {
    return { ok: false, error: "You cannot edit this card." };
  }

  const title = parsed.data.title.trim();
  await prisma.card.update({
    where: { id: card.id },
    data: { title },
  });

  revalidateBoard(card.list.boardId, access.workspaceId);
  return { ok: true, message: "Card updated." };
}

export async function archiveCardAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = cardIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid card." };

  const card = await prisma.card.findFirst({
    where: { id: parsed.data.cardId },
    include: { list: { select: { boardId: true, name: true } } },
  });
  if (!card) return { ok: false, error: "Card not found." };

  let access;
  try {
    access = await requireBoardAccess(card.list.boardId, auth.userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canEditBoardContent(access.role)) {
    return { ok: false, error: "You cannot archive this card." };
  }

  await prisma.$transaction([
    prisma.card.update({
      where: { id: card.id },
      data: { isArchived: true },
    }),
    prisma.activity.create({
      data: {
        workspaceId: access.workspaceId,
        boardId: card.list.boardId,
        cardId: card.id,
        actorId: auth.userId,
        action: "ARCHIVED",
        entityType: "card",
        entityId: card.id,
        metadata: { title: card.title },
      },
    }),
  ]);

  revalidateBoard(card.list.boardId, access.workspaceId);
  return { ok: true, message: "Card archived." };
}

export async function moveCardToListAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = moveCardSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const card = await prisma.card.findFirst({
    where: { id: parsed.data.cardId, isArchived: false },
    include: {
      list: { select: { id: true, boardId: true, name: true } },
    },
  });
  if (!card) return { ok: false, error: "Card not found." };

  const targetList = await prisma.list.findFirst({
    where: {
      id: parsed.data.targetListId,
      boardId: card.list.boardId,
      isArchived: false,
    },
    select: { id: true, name: true, boardId: true },
  });
  if (!targetList) return { ok: false, error: "Target list not found." };

  let access;
  try {
    access = await requireBoardAccess(card.list.boardId, auth.userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canEditBoardContent(access.role)) {
    return { ok: false, error: "You cannot move cards on this board." };
  }

  const last = await prisma.card.findFirst({
    where: { listId: targetList.id, isArchived: false },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await prisma.$transaction([
    prisma.card.update({
      where: { id: card.id },
      data: {
        listId: targetList.id,
        position: positionAfter(last?.position),
      },
    }),
    prisma.activity.create({
      data: {
        workspaceId: access.workspaceId,
        boardId: card.list.boardId,
        cardId: card.id,
        actorId: auth.userId,
        action: "MOVED",
        entityType: "card",
        entityId: card.id,
        metadata: {
          title: card.title,
          fromList: card.list.name,
          toList: targetList.name,
        },
      },
    }),
  ]);

  revalidateBoard(card.list.boardId, access.workspaceId);
  return { ok: true, message: "Card moved." };
}

export async function reorderListAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = reorderListSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  let access;
  try {
    access = await requireBoardAccess(parsed.data.boardId, auth.userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canEditBoardContent(access.role)) {
    return { ok: false, error: "You cannot reorder lists on this board." };
  }

  const lists = await prisma.list.findMany({
    where: { boardId: parsed.data.boardId, isArchived: false },
    select: { id: true, position: true },
    orderBy: { position: "asc" },
  });

  if (!lists.some((l) => l.id === parsed.data.listId)) {
    return { ok: false, error: "List not found." };
  }

  const orderedIds = lists.map((l) => l.id);
  const positions = Object.fromEntries(lists.map((l) => [l.id, l.position]));
  const resolved = resolveInsertPosition({
    orderedIds,
    positions,
    itemId: parsed.data.listId,
    beforeId: parsed.data.beforeListId,
    afterId: parsed.data.afterListId,
  });

  if (resolved.kind === "single") {
    await prisma.list.update({
      where: { id: parsed.data.listId },
      data: { position: resolved.position },
    });
  } else {
    await prisma.$transaction(
      resolved.positions.map((row) =>
        prisma.list.update({
          where: { id: row.id },
          data: { position: row.position },
        }),
      ),
    );
  }

  revalidateBoard(parsed.data.boardId, access.workspaceId);
  return { ok: true };
}

export async function reorderCardAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = reorderCardSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const card = await prisma.card.findFirst({
    where: { id: parsed.data.cardId, isArchived: false },
    include: {
      list: { select: { id: true, boardId: true, name: true } },
    },
  });
  if (!card) return { ok: false, error: "Card not found." };

  const targetList = await prisma.list.findFirst({
    where: {
      id: parsed.data.targetListId,
      boardId: card.list.boardId,
      isArchived: false,
    },
    select: { id: true, name: true, boardId: true },
  });
  if (!targetList) return { ok: false, error: "Target list not found." };

  let access;
  try {
    access = await requireBoardAccess(card.list.boardId, auth.userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canEditBoardContent(access.role)) {
    return { ok: false, error: "You cannot reorder cards on this board." };
  }

  const cardsInTarget = await prisma.card.findMany({
    where: { listId: targetList.id, isArchived: false },
    select: { id: true, position: true },
    orderBy: { position: "asc" },
  });

  const orderedIds = cardsInTarget
    .map((c) => c.id)
    .filter((id) => id !== card.id);
  // Ensure dragged card is represented in the order set for resolveInsertPosition
  const fullOrder =
    card.list.id === targetList.id
      ? cardsInTarget.map((c) => c.id)
      : [...orderedIds, card.id];

  const positions = Object.fromEntries(
    cardsInTarget.map((c) => [c.id, c.position]),
  );

  const resolved = resolveInsertPosition({
    orderedIds: fullOrder,
    positions,
    itemId: card.id,
    beforeId: parsed.data.beforeCardId,
    afterId: parsed.data.afterCardId,
  });

  const fromListName = card.list.name;
  const crossedLists = card.list.id !== targetList.id;

  if (resolved.kind === "single") {
    await prisma.$transaction([
      prisma.card.update({
        where: { id: card.id },
        data: {
          listId: targetList.id,
          position: resolved.position,
        },
      }),
      ...(crossedLists
        ? [
            prisma.activity.create({
              data: {
                workspaceId: access.workspaceId,
                boardId: card.list.boardId,
                cardId: card.id,
                actorId: auth.userId,
                action: "MOVED",
                entityType: "card",
                entityId: card.id,
                metadata: {
                  title: card.title,
                  fromList: fromListName,
                  toList: targetList.name,
                },
              },
            }),
          ]
        : []),
    ]);
  } else {
    await prisma.$transaction([
      prisma.card.update({
        where: { id: card.id },
        data: { listId: targetList.id },
      }),
      ...resolved.positions.map((row) =>
        prisma.card.update({
          where: { id: row.id },
          data: { position: row.position },
        }),
      ),
      ...(crossedLists
        ? [
            prisma.activity.create({
              data: {
                workspaceId: access.workspaceId,
                boardId: card.list.boardId,
                cardId: card.id,
                actorId: auth.userId,
                action: "MOVED",
                entityType: "card",
                entityId: card.id,
                metadata: {
                  title: card.title,
                  fromList: fromListName,
                  toList: targetList.name,
                },
              },
            }),
          ]
        : []),
    ]);
  }

  revalidateBoard(card.list.boardId, access.workspaceId);
  return { ok: true };
}
