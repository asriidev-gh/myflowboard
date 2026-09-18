"use server";

import { revalidatePath } from "next/cache";

import { canEditBoardContent } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { getWorkspaceMembership, requireUserId } from "@/features/boards/queries";
import { getBoardTemplate } from "@/features/templates/catalog";
import { createBoardFromTemplateSchema } from "@/features/templates/schemas";

export type ActionResult =
  | { ok: true; message?: string; id?: string }
  | { ok: false; error: string };

export async function createBoardFromTemplateAction(
  input: unknown,
): Promise<ActionResult> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: "You must be signed in." };
  }

  const parsed = createBoardFromTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const template = getBoardTemplate(parsed.data.templateId);
  if (!template) {
    return { ok: false, error: "Template not found." };
  }

  const membership = await getWorkspaceMembership(
    parsed.data.workspaceId,
    userId,
  );
  if (!membership || !canEditBoardContent(membership.role)) {
    return { ok: false, error: "You cannot create boards in this workspace." };
  }

  const name = (parsed.data.name?.trim() || template.name).slice(0, 100);
  const description =
    parsed.data.description?.trim() || template.description;

  const board = await prisma.board.create({
    data: {
      workspaceId: parsed.data.workspaceId,
      name,
      description,
      createdById: userId,
      members: {
        create: { userId, role: "admin" },
      },
      labels: {
        create: template.labels.map((label) => ({
          name: label.name,
          color: label.color,
        })),
      },
      lists: {
        create: template.lists.map((list, listIndex) => ({
          name: list.name,
          position: String((listIndex + 1) * 1024),
          cards: list.cards?.length
            ? {
                create: list.cards.map((card, cardIndex) => ({
                  title: card.title,
                  position: String((cardIndex + 1) * 1024),
                  createdById: userId,
                })),
              }
            : undefined,
        })),
      },
    },
  });

  await prisma.activity.create({
    data: {
      workspaceId: parsed.data.workspaceId,
      boardId: board.id,
      actorId: userId,
      action: "CREATED",
      entityType: "board",
      entityId: board.id,
      metadata: {
        name,
        fromTemplate: template.id,
      },
    },
  });

  revalidatePath("/boards");
  revalidatePath("/templates");
  revalidatePath("/dashboard");
  revalidatePath(`/workspaces/${parsed.data.workspaceId}`);
  revalidatePath(`/boards/${board.id}`);

  return {
    ok: true,
    id: board.id,
    message: `Board created from “${template.name}”.`,
  };
}
