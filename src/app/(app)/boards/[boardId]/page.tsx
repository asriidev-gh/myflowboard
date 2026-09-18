import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BoardHeaderActions } from "@/features/boards/components/board-header-actions";
import { BoardShell } from "@/features/boards/components/board-shell";
import { StarBoardButton } from "@/features/boards/components/star-board-button";
import {
  getBoardView,
  touchBoardViewed,
} from "@/features/boards/queries";
import { parseBoardViewMode } from "@/features/boards/views";
import { auth } from "@/lib/auth";
import {
  canEditBoardContent,
  canManageWorkspace,
} from "@/lib/auth/permissions";

interface BoardPageProps {
  params: Promise<{ boardId: string }>;
  searchParams: Promise<{ card?: string; view?: string }>;
}

export async function generateMetadata({
  params,
}: BoardPageProps): Promise<Metadata> {
  const session = await auth();
  if (!session?.user?.id) return { title: "Board" };
  const { boardId } = await params;
  const board = await getBoardView(boardId, session.user.id);
  return { title: board?.name ?? "Board" };
}

export default async function BoardPage({
  params,
  searchParams,
}: BoardPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { boardId } = await params;
  const { card: openCardId, view } = await searchParams;
  const board = await getBoardView(boardId, session.user.id);
  if (!board) notFound();

  void touchBoardViewed(board.id);

  const canEdit = canEditBoardContent(board.currentRole);
  const canDelete = canManageWorkspace(board.currentRole);

  return (
    <div className="-m-4 flex min-h-[calc(100vh-3.5rem)] flex-col md:-m-6">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/workspaces/${board.workspace.id}`}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {board.workspace.name}
            </Link>
            <span className="text-xs text-muted-foreground">/</span>
            <h1 className="font-heading truncate text-lg font-semibold tracking-tight">
              {board.name}
            </h1>
            <StarBoardButton boardId={board.id} isStarred={board.isStarred} />
          </div>
          {board.description ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {board.description}
            </p>
          ) : null}
        </div>
        <BoardHeaderActions
          board={board}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </header>

      <div className="flex min-h-0 flex-1 flex-col bg-[radial-gradient(900px_400px_at_0%_0%,color-mix(in_oklch,var(--brand)_12%,transparent),transparent)]">
        <BoardShell
          boardId={board.id}
          boardName={board.name}
          workspaceId={board.workspace.id}
          canEdit={canEdit}
          currentUserId={session.user.id}
          initialOpenCardId={openCardId ?? null}
          initialView={parseBoardViewMode(view)}
          boardLabels={board.labels.map((label) => ({
            id: label.id,
            name: label.name,
            color: label.color,
          }))}
          workspaceMembers={board.workspaceMembers}
          initialLists={board.lists.map((list) => ({
            id: list.id,
            name: list.name,
            position: list.position,
            cards: list.cards.map((card) => ({
              id: card.id,
              title: card.title,
              position: card.position,
              dueDate: card.dueDate,
              isCompleted: card.isCompleted,
              coverImage: card.coverImage,
              labels: card.labels,
              members: card.members,
            })),
          }))}
        />
      </div>
    </div>
  );
}
