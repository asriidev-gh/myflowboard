"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { canEditBoardContent } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { positionAfter } from "@/lib/ordering/position";
import { getStorageProvider, MAX_UPLOAD_BYTES } from "@/lib/storage";
import {
  attachmentIdSchema,
  cardIdSchema,
  checklistIdSchema,
  checklistItemIdSchema,
  commentIdSchema,
  createChecklistItemSchema,
  createChecklistSchema,
  createCommentSchema,
  createLabelSchema,
  toggleCardLabelSchema,
  toggleCardMemberSchema,
  updateCardDetailsSchema,
  updateChecklistItemSchema,
  updateChecklistSchema,
  updateCommentSchema,
} from "@/features/cards/schemas";
import {
  getCardDetail,
  requireCardAccess,
  requireUserId,
} from "@/features/cards/queries";
import { notifyUser } from "@/features/notifications/notify";

export type ActionResult =
  | { ok: true; message?: string; id?: string; data?: unknown }
  | { ok: false; error: string };

async function authUser(): Promise<ActionResult | { userId: string }> {
  try {
    return { userId: await requireUserId() };
  } catch {
    return { ok: false, error: "You must be signed in." };
  }
}

function revalidateCard(boardId: string, workspaceId: string, cardId: string) {
  revalidatePath(`/boards/${boardId}`);
  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath("/dashboard");
  revalidatePath("/boards");
  void cardId;
}

export async function loadCardDetailAction(
  cardId: string,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const detail = await getCardDetail(cardId, auth.userId);
  if (!detail) return { ok: false, error: "Card not found." };
  return { ok: true, data: detail };
}

export async function updateCardDetailsAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = updateCardDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  let access;
  try {
    access = await requireCardAccess(parsed.data.cardId, auth.userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canEditBoardContent(access.role)) {
    return { ok: false, error: "You cannot edit this card." };
  }

  const data: {
    title?: string;
    description?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
    dueDate?: Date | null;
    dueReminder?: Date | null;
    isCompleted?: boolean;
  } = {};

  if (parsed.data.title !== undefined) data.title = parsed.data.title.trim();
  if (parsed.data.description !== undefined) {
    data.description =
      parsed.data.description === null
        ? Prisma.JsonNull
        : (parsed.data.description as Prisma.InputJsonValue);
  }
  if (parsed.data.dueDate !== undefined) {
    data.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  }
  if (parsed.data.dueReminder !== undefined) {
    data.dueReminder = parsed.data.dueReminder
      ? new Date(parsed.data.dueReminder)
      : null;
  }
  if (parsed.data.isCompleted !== undefined) {
    data.isCompleted = parsed.data.isCompleted;
  }

  await prisma.card.update({
    where: { id: parsed.data.cardId },
    data,
  });

  if (parsed.data.isCompleted !== undefined) {
    await prisma.activity.create({
      data: {
        workspaceId: access.workspaceId,
        boardId: access.boardId,
        cardId: parsed.data.cardId,
        actorId: auth.userId,
        action: parsed.data.isCompleted ? "COMPLETED" : "UPDATED",
        entityType: "card",
        entityId: parsed.data.cardId,
        metadata: { isCompleted: parsed.data.isCompleted },
      },
    });
  }

  revalidateCard(access.boardId, access.workspaceId, parsed.data.cardId);
  return { ok: true, message: "Card updated." };
}

export async function toggleCardMemberAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = toggleCardMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input." };
  }

  const { cardId, userId } = parsed.data;

  // One lean query for access + ids (avoid requireCardAccess double round-trip).
  const card = await prisma.card.findFirst({
    where: {
      id: cardId,
      list: {
        board: {
          workspace: { members: { some: { userId: auth.userId } } },
        },
      },
    },
    select: {
      id: true,
      title: true,
      list: {
        select: {
          boardId: true,
          board: {
            select: {
              workspaceId: true,
              workspace: {
                select: {
                  members: {
                    where: { userId: auth.userId },
                    select: { role: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!card) {
    return { ok: false, error: "Card not found or access denied." };
  }

  const role = card.list.board.workspace.members[0]?.role ?? "GUEST";
  if (!canEditBoardContent(role)) {
    return { ok: false, error: "You cannot assign members." };
  }

  const boardId = card.list.boardId;
  const workspaceId = card.list.board.workspaceId;

  const removed = await prisma.cardMember.deleteMany({
    where: { cardId, userId },
  });

  const nowAssigned = removed.count === 0;
  if (nowAssigned) {
    await prisma.cardMember.create({
      data: { cardId, userId },
    });
  }

  // Activity + notification after the response — keep the toggle snappy.
  after(async () => {
    await prisma.activity.create({
      data: {
        workspaceId,
        boardId,
        cardId,
        actorId: auth.userId,
        action: nowAssigned ? "ASSIGNED" : "UNASSIGNED",
        entityType: "member",
        entityId: userId,
      },
    });

    if (nowAssigned && userId !== auth.userId) {
      await notifyUser({
        userId,
        type: "CARD_ASSIGNED",
        title: "Assigned to a card",
        body: `You were assigned to “${card.title}”.`,
        href: `/boards/${boardId}?card=${cardId}`,
      });
    }

    // Soft refresh paths that show assignees (My Work / board) without
    // blocking this action.
    revalidatePath(`/boards/${boardId}`);
    revalidatePath("/my-work");
  });

  return { ok: true };
}

export async function createLabelAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = createLabelSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { requireBoardAccess } = await import("@/features/boards/queries");
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
    return { ok: false, error: "You cannot create labels." };
  }

  const label = await prisma.label.create({
    data: {
      boardId: parsed.data.boardId,
      name: parsed.data.name.trim(),
      color: parsed.data.color,
    },
  });

  revalidatePath(`/boards/${parsed.data.boardId}`);
  return { ok: true, id: label.id, message: "Label created." };
}

export async function toggleCardLabelAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = toggleCardLabelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const { cardId, labelId } = parsed.data;

  const card = await prisma.card.findFirst({
    where: {
      id: cardId,
      list: {
        board: {
          workspace: { members: { some: { userId: auth.userId } } },
        },
      },
    },
    select: {
      id: true,
      list: {
        select: {
          boardId: true,
          board: {
            select: {
              workspaceId: true,
              workspace: {
                select: {
                  members: {
                    where: { userId: auth.userId },
                    select: { role: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!card) {
    return { ok: false, error: "Card not found or access denied." };
  }

  const role = card.list.board.workspace.members[0]?.role ?? "GUEST";
  if (!canEditBoardContent(role)) {
    return { ok: false, error: "You cannot change labels." };
  }

  const boardId = card.list.boardId;
  const workspaceId = card.list.board.workspaceId;

  const removed = await prisma.cardLabel.deleteMany({
    where: { cardId, labelId },
  });

  const nowLabeled = removed.count === 0;
  if (nowLabeled) {
    await prisma.cardLabel.create({
      data: { cardId, labelId },
    });
  }

  after(async () => {
    await prisma.activity.create({
      data: {
        workspaceId,
        boardId,
        cardId,
        actorId: auth.userId,
        action: nowLabeled ? "LABELED" : "UNLABELED",
        entityType: "label",
        entityId: labelId,
      },
    });
    revalidatePath(`/boards/${boardId}`);
  });

  return { ok: true };
}

export async function createChecklistAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = createChecklistSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  let access;
  try {
    access = await requireCardAccess(parsed.data.cardId, auth.userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canEditBoardContent(access.role)) {
    return { ok: false, error: "You cannot add checklists." };
  }

  const last = await prisma.checklist.findFirst({
    where: { cardId: parsed.data.cardId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const checklist = await prisma.checklist.create({
    data: {
      cardId: parsed.data.cardId,
      title: parsed.data.title.trim(),
      position: positionAfter(last?.position),
    },
  });

  revalidateCard(access.boardId, access.workspaceId, parsed.data.cardId);
  return { ok: true, id: checklist.id };
}

export async function updateChecklistAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = updateChecklistSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const checklist = await prisma.checklist.findUnique({
    where: { id: parsed.data.checklistId },
    select: { id: true, cardId: true },
  });
  if (!checklist) return { ok: false, error: "Checklist not found." };

  let access;
  try {
    access = await requireCardAccess(checklist.cardId, auth.userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canEditBoardContent(access.role)) {
    return { ok: false, error: "You cannot edit checklists." };
  }

  await prisma.checklist.update({
    where: { id: checklist.id },
    data: { title: parsed.data.title.trim() },
  });

  revalidateCard(access.boardId, access.workspaceId, checklist.cardId);
  return { ok: true };
}

export async function deleteChecklistAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = checklistIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const checklist = await prisma.checklist.findUnique({
    where: { id: parsed.data.checklistId },
    select: { id: true, cardId: true },
  });
  if (!checklist) return { ok: false, error: "Checklist not found." };

  let access;
  try {
    access = await requireCardAccess(checklist.cardId, auth.userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canEditBoardContent(access.role)) {
    return { ok: false, error: "You cannot delete checklists." };
  }

  await prisma.checklist.delete({ where: { id: checklist.id } });
  revalidateCard(access.boardId, access.workspaceId, checklist.cardId);
  return { ok: true };
}

export async function createChecklistItemAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = createChecklistItemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const checklist = await prisma.checklist.findUnique({
    where: { id: parsed.data.checklistId },
    select: { id: true, cardId: true },
  });
  if (!checklist) return { ok: false, error: "Checklist not found." };

  let access;
  try {
    access = await requireCardAccess(checklist.cardId, auth.userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canEditBoardContent(access.role)) {
    return { ok: false, error: "You cannot add checklist items." };
  }

  const last = await prisma.checklistItem.findFirst({
    where: { checklistId: checklist.id },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const item = await prisma.checklistItem.create({
    data: {
      checklistId: checklist.id,
      title: parsed.data.title.trim(),
      position: positionAfter(last?.position),
    },
  });

  revalidateCard(access.boardId, access.workspaceId, checklist.cardId);
  return { ok: true, id: item.id };
}

export async function updateChecklistItemAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = updateChecklistItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const item = await prisma.checklistItem.findUnique({
    where: { id: parsed.data.itemId },
    include: { checklist: { select: { cardId: true } } },
  });
  if (!item) return { ok: false, error: "Item not found." };

  let access;
  try {
    access = await requireCardAccess(item.checklist.cardId, auth.userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canEditBoardContent(access.role)) {
    return { ok: false, error: "You cannot update checklist items." };
  }

  await prisma.checklistItem.update({
    where: { id: item.id },
    data: {
      ...(parsed.data.title !== undefined
        ? { title: parsed.data.title.trim() }
        : {}),
      ...(parsed.data.isCompleted !== undefined
        ? { isCompleted: parsed.data.isCompleted }
        : {}),
    },
  });

  revalidateCard(access.boardId, access.workspaceId, item.checklist.cardId);
  return { ok: true };
}

export async function deleteChecklistItemAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = checklistItemIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const item = await prisma.checklistItem.findUnique({
    where: { id: parsed.data.itemId },
    include: { checklist: { select: { cardId: true } } },
  });
  if (!item) return { ok: false, error: "Item not found." };

  let access;
  try {
    access = await requireCardAccess(item.checklist.cardId, auth.userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canEditBoardContent(access.role)) {
    return { ok: false, error: "You cannot delete checklist items." };
  }

  await prisma.checklistItem.delete({ where: { id: item.id } });
  revalidateCard(access.boardId, access.workspaceId, item.checklist.cardId);
  return { ok: true };
}

export async function createCommentAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = createCommentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  let access;
  try {
    access = await requireCardAccess(parsed.data.cardId, auth.userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canEditBoardContent(access.role)) {
    return { ok: false, error: "You cannot comment on this card." };
  }

  const comment = await prisma.comment.create({
    data: {
      cardId: parsed.data.cardId,
      userId: auth.userId,
      body: parsed.data.body.trim(),
    },
  });

  await prisma.activity.create({
    data: {
      workspaceId: access.workspaceId,
      boardId: access.boardId,
      cardId: parsed.data.cardId,
      actorId: auth.userId,
      action: "COMMENTED",
      entityType: "comment",
      entityId: comment.id,
    },
  });

  const recipients = await prisma.cardMember.findMany({
    where: {
      cardId: parsed.data.cardId,
      userId: { not: auth.userId },
    },
    select: { userId: true },
  });

  await Promise.all(
    recipients.map((recipient) =>
      notifyUser({
        userId: recipient.userId,
        type: "CARD_COMMENTED",
        title: "New comment on a card",
        body: `Someone commented on “${access.card.title}”.`,
        href: `/boards/${access.boardId}?card=${parsed.data.cardId}`,
      }),
    ),
  );

  revalidateCard(access.boardId, access.workspaceId, parsed.data.cardId);
  return { ok: true, id: comment.id };
}

export async function updateCommentAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = updateCommentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const comment = await prisma.comment.findUnique({
    where: { id: parsed.data.commentId },
  });
  if (!comment) return { ok: false, error: "Comment not found." };
  if (comment.userId !== auth.userId) {
    return { ok: false, error: "You can only edit your own comments." };
  }

  let access;
  try {
    access = await requireCardAccess(comment.cardId, auth.userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  await prisma.comment.update({
    where: { id: comment.id },
    data: { body: parsed.data.body.trim() },
  });

  revalidateCard(access.boardId, access.workspaceId, comment.cardId);
  return { ok: true };
}

export async function deleteCommentAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = commentIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const comment = await prisma.comment.findUnique({
    where: { id: parsed.data.commentId },
  });
  if (!comment) return { ok: false, error: "Comment not found." };

  let access;
  try {
    access = await requireCardAccess(comment.cardId, auth.userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (
    comment.userId !== auth.userId &&
    !canEditBoardContent(access.role)
  ) {
    return { ok: false, error: "You cannot delete this comment." };
  }

  // Authors can always delete; admins/members with edit can delete others? Spec: edit/delete own. Keep author-only for delete of others unless admin.
  if (comment.userId !== auth.userId && access.role !== "OWNER" && access.role !== "ADMIN") {
    return { ok: false, error: "You can only delete your own comments." };
  }

  await prisma.comment.delete({ where: { id: comment.id } });
  revalidateCard(access.boardId, access.workspaceId, comment.cardId);
  return { ok: true };
}

export async function uploadAttachmentAction(
  formData: FormData,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const cardId = String(formData.get("cardId") ?? "");
  const file = formData.get("file");

  if (!cardId || !(file instanceof File)) {
    return { ok: false, error: "Card and file are required." };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "File exceeds the 10 MB size limit." };
  }

  let access;
  try {
    access = await requireCardAccess(cardId, auth.userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canEditBoardContent(access.role)) {
    return { ok: false, error: "You cannot upload attachments." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = getStorageProvider();

  try {
    const stored = await storage.upload({
      buffer,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      prefix: `cards/${cardId}`,
    });

    const attachment = await prisma.attachment.create({
      data: {
        cardId,
        userId: auth.userId,
        fileName: stored.fileName,
        fileSize: stored.size,
        mimeType: stored.mimeType,
        storageKey: stored.key,
        storageProvider: stored.provider,
      },
    });

    revalidateCard(access.boardId, access.workspaceId, cardId);
    return { ok: true, id: attachment.id, message: "File uploaded." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Upload failed.",
    };
  }
}

export async function deleteAttachmentAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = attachmentIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const attachment = await prisma.attachment.findUnique({
    where: { id: parsed.data.attachmentId },
  });
  if (!attachment) return { ok: false, error: "Attachment not found." };

  let access;
  try {
    access = await requireCardAccess(attachment.cardId, auth.userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (
    attachment.userId !== auth.userId &&
    access.role !== "OWNER" &&
    access.role !== "ADMIN"
  ) {
    return { ok: false, error: "You cannot delete this attachment." };
  }

  try {
    const storage = getStorageProvider();
    await storage.delete(attachment.storageKey);
  } catch {
    // Continue deleting DB row even if storage delete fails
  }

  await prisma.attachment.delete({ where: { id: attachment.id } });
  revalidateCard(access.boardId, access.workspaceId, attachment.cardId);
  return { ok: true };
}

export async function archiveCardFromDetailAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = cardIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid card." };

  const { archiveCardAction } = await import("@/features/boards/actions");
  return archiveCardAction(parsed.data);
}
