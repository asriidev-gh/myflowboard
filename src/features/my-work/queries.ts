import {
  endOfDay,
  isBefore,
  isToday,
  isWithinInterval,
  startOfDay,
} from "date-fns";

import { prisma } from "@/lib/db/prisma";

export type MyWorkGroupKey = "overdue" | "today" | "upcoming" | "none";

export type MyWorkCard = {
  id: string;
  title: string;
  dueDate: Date | null;
  isCompleted: boolean;
  boardId: string;
  boardName: string;
  listName: string;
  workspaceName: string;
  labels: { id: string; name: string; color: string }[];
};

export function groupMyWorkCards(cards: MyWorkCard[]) {
  const groups: Record<MyWorkGroupKey, MyWorkCard[]> = {
    overdue: [],
    today: [],
    upcoming: [],
    none: [],
  };

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  for (const card of cards) {
    if (!card.dueDate) {
      groups.none.push(card);
      continue;
    }
    if (card.isCompleted) {
      groups.none.push(card);
      continue;
    }
    if (isBefore(card.dueDate, todayStart)) {
      groups.overdue.push(card);
    } else if (
      isToday(card.dueDate) ||
      isWithinInterval(card.dueDate, { start: todayStart, end: todayEnd })
    ) {
      groups.today.push(card);
    } else {
      groups.upcoming.push(card);
    }
  }

  return groups;
}

export async function listAssignedCards(userId: string, limit = 50) {
  const cards = await prisma.card.findMany({
    where: {
      isArchived: false,
      members: { some: { userId } },
      list: {
        isArchived: false,
        board: {
          isArchived: false,
          workspace: { members: { some: { userId } } },
        },
      },
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      isCompleted: true,
      list: {
        select: {
          name: true,
          board: {
            select: {
              id: true,
              name: true,
              workspace: { select: { name: true } },
            },
          },
        },
      },
      labels: {
        select: { label: { select: { id: true, name: true, color: true } } },
      },
    },
    orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    take: limit,
  });

  return cards.map(
    (card): MyWorkCard => ({
      id: card.id,
      title: card.title,
      dueDate: card.dueDate,
      isCompleted: card.isCompleted,
      boardId: card.list.board.id,
      boardName: card.list.board.name,
      listName: card.list.name,
      workspaceName: card.list.board.workspace.name,
      labels: card.labels.map((entry) => entry.label),
    }),
  );
}
