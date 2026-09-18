import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, LayoutGrid, Star } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateBoardDialog } from "@/features/boards/components/create-board-dialog";
import { listBoardsForWorkspace } from "@/features/boards/queries";
import { DeleteWorkspaceDialog } from "@/features/workspaces/components/delete-workspace-dialog";
import { EditWorkspaceDialog } from "@/features/workspaces/components/edit-workspace-dialog";
import { WorkspaceMembers } from "@/features/workspaces/components/workspace-members";
import { getWorkspaceForUser } from "@/features/workspaces/queries";
import { auth } from "@/lib/auth";
import {
  canDeleteWorkspace,
  canEditBoardContent,
  canManageWorkspace,
} from "@/lib/auth/permissions";

interface WorkspacePageProps {
  params: Promise<{ workspaceId: string }>;
}

export async function generateMetadata({
  params,
}: WorkspacePageProps): Promise<Metadata> {
  const { workspaceId } = await params;
  const session = await auth();
  if (!session?.user?.id) return { title: "Workspace" };

  const workspace = await getWorkspaceForUser(workspaceId, session.user.id);
  return { title: workspace?.name ?? "Workspace" };
}

export default async function WorkspaceDetailPage({
  params,
}: WorkspacePageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { workspaceId } = await params;
  const workspace = await getWorkspaceForUser(workspaceId, session.user.id);
  if (!workspace) {
    notFound();
  }

  const boardData = await listBoardsForWorkspace(
    workspaceId,
    session.user.id,
  );
  const boards = boardData?.boards ?? [];

  const canEdit = canManageWorkspace(workspace.currentRole);
  const canDelete = canDeleteWorkspace(workspace.currentRole);
  const canCreateBoard = canEditBoardContent(workspace.currentRole);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="space-y-4">
        <Link
          href="/workspaces"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          All workspaces
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
              {workspace.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {workspace.description || "No description yet."}
            </p>
            <p className="text-xs text-muted-foreground">
              Your role:{" "}
              <span className="capitalize">
                {workspace.currentRole.toLowerCase()}
              </span>
              {" · "}
              {boards.length} board
              {boards.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canCreateBoard ? (
              <CreateBoardDialog workspaceId={workspace.id} />
            ) : null}
            {canEdit ? <EditWorkspaceDialog workspace={workspace} /> : null}
            {canDelete ? (
              <DeleteWorkspaceDialog
                workspaceId={workspace.id}
                workspaceName={workspace.name}
              />
            ) : null}
          </div>
        </div>
      </div>

      <Card className="shadow-none">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Boards</CardTitle>
            <CardDescription>
              Open a board to manage lists and cards.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {boards.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed px-4 py-8">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <LayoutGrid className="size-4" />
              </div>
              <p className="text-sm text-muted-foreground">
                No boards in this workspace yet.
              </p>
              {canCreateBoard ? (
                <CreateBoardDialog workspaceId={workspace.id} />
              ) : null}
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {boards.map((board) => (
                <li key={board.id}>
                  <Link
                    href={`/boards/${board.id}`}
                    className="flex items-start justify-between gap-2 rounded-xl border p-4 transition-colors hover:bg-accent/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{board.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {board._count.lists} list
                        {board._count.lists === 1 ? "" : "s"}
                      </p>
                    </div>
                    {board.stars.length > 0 ? (
                      <Star className="size-4 shrink-0 fill-amber-500 text-amber-500" />
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
          <CardDescription>
            Invite teammates by email. They must already have a My-FlowBoard
            account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkspaceMembers
            workspaceId={workspace.id}
            currentUserId={session.user.id}
            currentRole={workspace.currentRole}
            members={workspace.members}
          />
        </CardContent>
      </Card>
    </div>
  );
}
