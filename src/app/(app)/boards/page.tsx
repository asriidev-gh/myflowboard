import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutGrid, Star } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateBoardDialog } from "@/features/boards/components/create-board-dialog";
import { listBoardsForUser } from "@/features/boards/queries";
import { listWorkspacesForUser } from "@/features/workspaces/queries";
import { auth } from "@/lib/auth";
import { canEditBoardContent } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Boards" };

export default async function BoardsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [boards, workspaces] = await Promise.all([
    listBoardsForUser(session.user.id),
    listWorkspacesForUser(session.user.id),
  ]);

  const creatableWorkspace = workspaces.find((ws) =>
    canEditBoardContent(ws.members[0]?.role ?? "GUEST"),
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Boards
          </h1>
          <p className="text-sm text-muted-foreground">
            Jump into any board across your workspaces.
          </p>
        </div>
        {creatableWorkspace ? (
          <CreateBoardDialog workspaceId={creatableWorkspace.id} />
        ) : null}
      </div>

      {boards.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No boards yet"
          description={
            creatableWorkspace
              ? "Create a board to start organizing lists and cards."
              : "Create a workspace first, then add boards."
          }
          action={
            creatableWorkspace ? (
              <CreateBoardDialog workspaceId={creatableWorkspace.id} />
            ) : (
              <Link
                href="/workspaces"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Go to workspaces
              </Link>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <Card key={board.id} className="shadow-none">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">
                    <Link
                      href={`/boards/${board.id}`}
                      className="hover:text-brand hover:underline"
                    >
                      {board.name}
                    </Link>
                  </CardTitle>
                  {board.stars.length > 0 ? (
                    <Star className="size-4 fill-amber-500 text-amber-500" />
                  ) : null}
                </div>
                <CardDescription>{board.workspace.name}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {board._count.lists} list
                  {board._count.lists === 1 ? "" : "s"}
                </span>
                <Link
                  href={`/boards/${board.id}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                  )}
                >
                  Open
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
