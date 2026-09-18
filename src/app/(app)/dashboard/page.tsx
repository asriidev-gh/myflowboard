import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity as ActivityIcon,
  Building2,
  CheckSquare,
  LayoutGrid,
  Sparkles,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatDueDate,
  getDueVisualState,
} from "@/features/cards/due-date";
import {
  groupMyWorkCards,
  listAssignedCards,
} from "@/features/my-work/queries";
import { auth } from "@/lib/auth";
import { branding } from "@/lib/branding";
import { prisma } from "@/lib/db/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard",
};

function formatActivity(activity: {
  action: string;
  entityType: string;
  actor: { name: string | null; email: string };
  board?: { name: string } | null;
  createdAt: Date;
}) {
  const actorName = activity.actor.name ?? activity.actor.email;
  const action = activity.action.toLowerCase().replaceAll("_", " ");
  const entity = activity.entityType.toLowerCase();
  const boardBit = activity.board?.name ? ` on ${activity.board.name}` : "";
  return `${actorName} ${action} a ${entity}${boardBit}.`;
}

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";
  const userId = session?.user?.id;

  const [activities, assigned] = await Promise.all([
    userId
      ? prisma.activity.findMany({
          where: {
            OR: [
              { actorId: userId },
              {
                workspace: {
                  members: { some: { userId } },
                },
              },
            ],
          },
          include: {
            actor: { select: { name: true, email: true } },
            board: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 8,
        })
      : Promise.resolve([]),
    userId ? listAssignedCards(userId, 12) : Promise.resolve([]),
  ]);

  const taskGroups = groupMyWorkCards(assigned);
  const spotlightTasks = [
    ...taskGroups.overdue,
    ...taskGroups.today,
    ...taskGroups.upcoming,
  ].slice(0, 6);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Search, filter boards, and stay on top of assignments in{" "}
          {branding.name}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Recent boards",
            description: "Boards you opened lately",
            icon: LayoutGrid,
            href: "/boards",
          },
          {
            title: "My tasks",
            description: "Cards assigned to you",
            icon: CheckSquare,
            href: "/my-work",
          },
          {
            title: "Workspaces",
            description: "Teams and projects",
            icon: Building2,
            href: "/workspaces",
          },
          {
            title: "Templates",
            description: "Start from a pattern",
            icon: Sparkles,
            href: "/templates",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="border-border/80 shadow-none">
              <CardHeader className="pb-2">
                <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <Icon className="size-4" />
                </div>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href={item.href}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                  )}
                >
                  Open
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-base">My tasks</CardTitle>
              <CardDescription>Assigned cards by urgency</CardDescription>
            </div>
            <Link
              href="/my-work"
              className="text-xs text-brand hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {spotlightTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No open assigned cards with due dates. Assign yourself from a
                card to track work here.
              </p>
            ) : (
              <ul className="space-y-2">
                {spotlightTasks.map((card) => {
                  const dueState = getDueVisualState(
                    card.dueDate,
                    card.isCompleted,
                  );
                  return (
                    <li key={card.id}>
                      <Link
                        href={`/boards/${card.boardId}?card=${card.id}`}
                        className="flex items-start justify-between gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-accent/40"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {card.title}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {card.boardName} · {card.listName}
                          </span>
                        </span>
                        {card.dueDate ? (
                          <span
                            className={cn(
                              "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                              dueState === "overdue" &&
                                "bg-destructive/15 text-destructive",
                              dueState === "soon" &&
                                "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                              dueState === "normal" &&
                                "bg-muted text-muted-foreground",
                            )}
                          >
                            {formatDueDate(card.dueDate)}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
            <CardDescription>
              Recent actions across your workspaces
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <ActivityIcon className="size-4" />
                </div>
                <p className="text-sm font-medium">No activity yet</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  When you create workspaces, boards, and cards, updates will
                  show up here.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {activities.map((activity) => (
                  <li
                    key={activity.id}
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    <p className="text-foreground">
                      {formatActivity(activity)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {activity.createdAt.toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
