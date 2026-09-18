import type { WorkspaceRole } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { sortByPosition } from "@/lib/ordering/position";

export async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function getWorkspaceMembership(
  workspaceId: string,
  userId: string,
) {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
}

export async function requireBoardAccess(boardId: string, userId: string) {
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      isArchived: false,
      workspace: {
        members: { some: { userId } },
      },
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          members: {
            where: { userId },
            select: { role: true },
          },
        },
      },
    },
  });

  if (!board) {
    throw new Error("Board not found or access denied.");
  }

  const role = (board.workspace.members[0]?.role ?? "GUEST") as WorkspaceRole;
  return { board, role, workspaceId: board.workspaceId };
}

export async function listBoardsForUser(userId: string) {
  return prisma.board.findMany({
    where: {
      isArchived: false,
      workspace: {
        members: { some: { userId } },
      },
    },
    include: {
      workspace: { select: { id: true, name: true } },
      stars: { where: { userId }, select: { id: true } },
      _count: { select: { lists: true } },
    },
    orderBy: [{ lastViewedAt: "desc" }, { updatedAt: "desc" }],
  });
}

export async function listBoardsForWorkspace(
  workspaceId: string,
  userId: string,
) {
  const membership = await getWorkspaceMembership(workspaceId, userId);
  if (!membership) return null;

  const boards = await prisma.board.findMany({
    where: { workspaceId, isArchived: false },
    include: {
      stars: { where: { userId }, select: { id: true } },
      _count: { select: { lists: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return { boards, role: membership.role };
}

export async function getBoardView(boardId: string, userId: string) {
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      isArchived: false,
      workspace: { members: { some: { userId } } },
    },
    include: {
      labels: { orderBy: { name: "asc" } },
      workspace: {
        select: {
          id: true,
          name: true,
          members: {
            select: {
              role: true,
              userId: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      stars: { where: { userId }, select: { id: true } },
      lists: {
        where: { isArchived: false },
        include: {
          cards: {
            where: { isArchived: false },
            include: {
              labels: { include: { label: true } },
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      image: true,
                    },
                  },
                },
              },
            },
            orderBy: { position: "asc" },
          },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!board) return null;

  const lists = sortByPosition(board.lists).map((list) => ({
    ...list,
    cards: sortByPosition(list.cards).map((card) => ({
      ...card,
      labels: card.labels.map((entry) => entry.label),
      members: card.members.map((entry) => entry.user),
    })),
  }));

  const currentMembership = board.workspace.members.find(
    (m) => m.userId === userId,
  );

  return {
    ...board,
    lists,
    workspaceMembers: board.workspace.members.map((m) => m.user),
    currentRole: (currentMembership?.role ?? "GUEST") as WorkspaceRole,
    isStarred: board.stars.length > 0,
  };
}

export async function touchBoardViewed(boardId: string) {
  await prisma.board.update({
    where: { id: boardId },
    data: { lastViewedAt: new Date() },
  });
}
