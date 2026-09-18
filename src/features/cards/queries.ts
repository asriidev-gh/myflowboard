import type { WorkspaceRole } from "@prisma/client";

import { sortByPosition } from "@/lib/ordering/position";
import { prisma } from "@/lib/db/prisma";
import { requireBoardAccess, requireUserId } from "@/features/boards/queries";
import type { CardDetail } from "@/features/cards/types";

export type {
  BoardCardContext,
  CardDetail,
  CardDetailLabel,
  CardDetailMember,
  CardDetailSeed,
} from "@/features/cards/types";
export { cardDetailQueryKey, seedToCardDetail } from "@/features/cards/types";

export async function getCardDetail(cardId: string, userId: string) {
  const card = await prisma.card.findFirst({
    where: {
      id: cardId,
      isArchived: false,
      list: {
        board: {
          workspace: { members: { some: { userId } } },
        },
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      dueDate: true,
      isCompleted: true,
      list: {
        select: {
          id: true,
          name: true,
          board: {
            select: {
              id: true,
              name: true,
              workspaceId: true,
              workspace: {
                select: {
                  members: {
                    where: { userId },
                    select: { role: true },
                  },
                },
              },
            },
          },
        },
      },
      members: {
        select: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
      labels: {
        select: {
          label: { select: { id: true, name: true, color: true } },
        },
      },
      checklists: {
        select: {
          id: true,
          title: true,
          position: true,
          items: {
            select: {
              id: true,
              title: true,
              isCompleted: true,
              position: true,
            },
          },
        },
        orderBy: { position: "asc" },
      },
      comments: {
        select: {
          id: true,
          body: true,
          createdAt: true,
          userId: true,
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      attachments: {
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          storageKey: true,
          storageProvider: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      activities: {
        select: {
          id: true,
          action: true,
          entityType: true,
          createdAt: true,
          actor: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
      },
    },
  });

  if (!card) return null;

  const role = (card.list.board.workspace.members[0]?.role ??
    "GUEST") as WorkspaceRole;

  return {
    id: card.id,
    title: card.title,
    description: card.description,
    dueDate: card.dueDate,
    isCompleted: card.isCompleted,
    list: {
      id: card.list.id,
      name: card.list.name,
      board: {
        id: card.list.board.id,
        name: card.list.board.name,
        workspaceId: card.list.board.workspaceId,
      },
    },
    members: card.members,
    labels: card.labels,
    checklists: sortByPosition(card.checklists).map((checklist) => ({
      id: checklist.id,
      title: checklist.title,
      items: sortByPosition(checklist.items).map((item) => ({
        id: item.id,
        title: item.title,
        isCompleted: item.isCompleted,
      })),
    })),
    comments: card.comments,
    attachments: card.attachments,
    activities: card.activities,
    currentRole: role,
  } satisfies CardDetail;
}

export async function requireCardAccess(cardId: string, userId: string) {
  const card = await prisma.card.findFirst({
    where: {
      id: cardId,
      list: {
        board: {
          workspace: { members: { some: { userId } } },
        },
      },
    },
    select: {
      id: true,
      title: true,
      listId: true,
      list: {
        select: {
          boardId: true,
          name: true,
          board: { select: { workspaceId: true } },
        },
      },
    },
  });

  if (!card) {
    throw new Error("Card not found or access denied.");
  }

  const access = await requireBoardAccess(card.list.boardId, userId);
  return {
    card,
    role: access.role,
    boardId: card.list.boardId,
    workspaceId: card.list.board.workspaceId,
  };
}

export { requireUserId };
