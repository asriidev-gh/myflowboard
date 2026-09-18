import type { WorkspaceRole } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function getMembership(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
  });
}

export async function requireMembership(workspaceId: string, userId: string) {
  const membership = await getMembership(workspaceId, userId);
  if (!membership) {
    throw new Error("You do not have access to this workspace.");
  }
  return membership;
}

export async function listWorkspacesForUser(userId: string) {
  return prisma.workspace.findMany({
    where: {
      members: { some: { userId } },
    },
    include: {
      members: {
        where: { userId },
        select: { role: true },
      },
      _count: {
        select: { members: true, boards: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getWorkspaceForUser(workspaceId: string, userId: string) {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      members: { some: { userId } },
    },
    include: {
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
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      },
      _count: {
        select: { boards: true },
      },
    },
  });

  if (!workspace) return null;

  const currentMember = workspace.members.find((m) => m.userId === userId);
  return {
    ...workspace,
    currentRole: (currentMember?.role ?? "GUEST") as WorkspaceRole,
  };
}
