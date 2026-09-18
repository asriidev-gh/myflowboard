import { prisma } from "@/lib/db/prisma";

export type SearchHit =
  | {
      kind: "card";
      id: string;
      title: string;
      subtitle: string;
      href: string;
    }
  | {
      kind: "board";
      id: string;
      title: string;
      subtitle: string;
      href: string;
    }
  | {
      kind: "workspace";
      id: string;
      title: string;
      subtitle: string;
      href: string;
    };

export async function searchAccessible(
  userId: string,
  rawQuery: string,
): Promise<SearchHit[]> {
  const q = rawQuery.trim();
  if (q.length < 2) return [];

  const membershipFilter = {
    workspace: { members: { some: { userId } } },
  };

  const [cards, boards, workspaces] = await Promise.all([
    prisma.card.findMany({
      where: {
        isArchived: false,
        title: { contains: q, mode: "insensitive" },
        list: {
          isArchived: false,
          board: { isArchived: false, ...membershipFilter },
        },
      },
      select: {
        id: true,
        title: true,
        list: {
          select: {
            name: true,
            board: {
              select: { id: true, name: true },
            },
          },
        },
      },
      take: 8,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.board.findMany({
      where: {
        isArchived: false,
        name: { contains: q, mode: "insensitive" },
        ...membershipFilter,
      },
      select: {
        id: true,
        name: true,
        workspace: { select: { name: true } },
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.workspace.findMany({
      where: {
        name: { contains: q, mode: "insensitive" },
        members: { some: { userId } },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return [
    ...cards.map(
      (card): SearchHit => ({
        kind: "card",
        id: card.id,
        title: card.title,
        subtitle: `${card.list.board.name} · ${card.list.name}`,
        href: `/boards/${card.list.board.id}?card=${card.id}`,
      }),
    ),
    ...boards.map(
      (board): SearchHit => ({
        kind: "board",
        id: board.id,
        title: board.name,
        subtitle: board.workspace.name,
        href: `/boards/${board.id}`,
      }),
    ),
    ...workspaces.map(
      (workspace): SearchHit => ({
        kind: "workspace",
        id: workspace.id,
        title: workspace.name,
        subtitle: `/${workspace.slug}`,
        href: `/workspaces/${workspace.id}`,
      }),
    ),
  ];
}
