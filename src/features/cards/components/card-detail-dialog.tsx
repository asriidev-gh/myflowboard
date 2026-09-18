"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Calendar,
  Check,
  CheckSquare,
  Paperclip,
  Tag,
  Users,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  createChecklistAction,
  createChecklistItemAction,
  createCommentAction,
  createLabelAction,
  deleteAttachmentAction,
  deleteChecklistAction,
  deleteChecklistItemAction,
  deleteCommentAction,
  toggleCardLabelAction,
  toggleCardMemberAction,
  updateCardDetailsAction,
  updateChecklistItemAction,
  uploadAttachmentAction,
} from "@/features/cards/actions";
import { fetchCardDetail } from "@/features/cards/fetch-card-detail";
import {
  formatDueDate,
  fromDatetimeLocalValue,
  getDueVisualState,
  toDatetimeLocalValue,
} from "@/features/cards/due-date";
import { LABEL_COLORS } from "@/features/cards/schemas";
import {
  cardDetailQueryKey,
  seedToCardDetail,
  type BoardCardContext,
  type CardDetail,
  type CardDetailLabel,
  type CardDetailMember,
  type CardDetailSeed,
} from "@/features/cards/types";
import { MAX_UPLOAD_BYTES } from "@/lib/storage/types";
import { cn } from "@/lib/utils";

const CardDescriptionEditor = dynamic(
  () =>
    import("@/features/cards/components/card-description-editor").then(
      (mod) => mod.CardDescriptionEditor,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-24 animate-pulse rounded-lg bg-muted/60" aria-hidden />
    ),
  },
);

interface CardDetailDialogProps {
  cardId: string;
  canEdit: boolean;
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seed?: CardDetailSeed | null;
  boardContext: BoardCardContext;
  /** Keep the board canvas in sync when assignees change. */
  onMembersChange?: (cardId: string, members: CardDetailMember[]) => void;
  /** Keep the board canvas in sync when labels change. */
  onLabelsChange?: (cardId: string, labels: CardDetailLabel[]) => void;
  /** Keep the board canvas in sync when the title changes. */
  onTitleChange?: (cardId: string, title: string) => void;
}

function initials(name: string | null, email: string) {
  if (name?.trim()) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
  }
  return (email[0] ?? "?").toUpperCase();
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentUrl(attachment: CardDetail["attachments"][number]) {
  return `/api/attachments/${attachment.id}`;
}

export function CardDetailDialog({
  cardId,
  canEdit,
  currentUserId,
  open,
  onOpenChange,
  seed,
  boardContext,
  onMembersChange,
  onLabelsChange,
  onTitleChange,
}: CardDetailDialogProps) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [newChecklist, setNewChecklist] = useState("");
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState<string>(LABEL_COLORS[0]);
  const [createdLabels, setCreatedLabels] = useState<CardDetailLabel[]>([]);
  /** Local UI source of truth so toggles feel instant (query cache may be empty while placeholder). */
  const [localMembers, setLocalMembers] = useState<CardDetailMember[] | null>(
    null,
  );
  const [localLabels, setLocalLabels] = useState<CardDetailLabel[] | null>(
    null,
  );

  const {
    data: card,
    isPending,
    isPlaceholderData,
    isError,
    error,
  } = useQuery({
    queryKey: cardDetailQueryKey(cardId),
    queryFn: () => fetchCardDetail(cardId),
    enabled: open && !!cardId,
    staleTime: 30_000,
    placeholderData: () =>
      seed ? seedToCardDetail(seed) : undefined,
  });

  useEffect(() => {
    setLocalMembers(null);
    setLocalLabels(null);
    setCreatedLabels([]);
  }, [cardId]);

  useEffect(() => {
    if (!card) return;
    setLocalMembers((prev) =>
      prev ?? card.members.map((entry) => entry.user),
    );
    setLocalLabels((prev) =>
      prev ?? card.labels.map((entry) => entry.label),
    );
  }, [card]);

  const boardLabels = [
    ...boardContext.boardLabels,
    ...createdLabels.filter(
      (label) => !boardContext.boardLabels.some((b) => b.id === label.id),
    ),
  ];

  const activeMembers =
    localMembers ??
    card?.members.map((entry) => entry.user) ??
    seed?.members ??
    [];
  const activeLabels =
    localLabels ??
    card?.labels.map((entry) => entry.label) ??
    seed?.labels ??
    [];

  const title =
    titleDraft ?? card?.title ?? seed?.title ?? "";

  useEffect(() => {
    if (!open || !isError) return;
    toast.error(error instanceof Error ? error.message : "Failed to load card");
    onOpenChange(false);
  }, [open, isError, error, onOpenChange]);

  function syncTitle(nextTitle: string) {
    onTitleChange?.(cardId, nextTitle);
    queryClient.setQueryData(
      cardDetailQueryKey(cardId),
      (current: CardDetail | undefined) => {
        const base =
          current ?? (seed ? seedToCardDetail(seed) : undefined);
        if (!base) return base;
        return { ...base, title: nextTitle };
      },
    );
  }

  function saveTitle(rawTitle: string) {
    if (!canEdit || !card) {
      setTitleDraft(null);
      return;
    }
    const trimmed = rawTitle.trim();
    if (!trimmed) {
      setTitleDraft(null);
      toast.error("Title is required");
      return;
    }
    if (trimmed === card.title) {
      setTitleDraft(null);
      return;
    }

    // Optimistic: update board + cache immediately; persist in the background.
    syncTitle(trimmed);
    setTitleDraft(null);
    void updateCardDetailsAction({ cardId: card.id, title: trimmed }).then(
      (result) => {
        if (!result.ok) {
          toast.error(result.error ?? "Could not update title");
          syncTitle(card.title);
        }
      },
    );
  }

  function flushTitleAndClose() {
    if (titleDraft !== null) {
      saveTitle(titleDraft);
    }
    onOpenChange(false);
  }

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong");
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: cardDetailQueryKey(cardId),
      });
    });
  }

  function syncMembers(nextMembers: CardDetailMember[]) {
    setLocalMembers(nextMembers);
    onMembersChange?.(cardId, nextMembers);
    queryClient.setQueryData(
      cardDetailQueryKey(cardId),
      (current: CardDetail | undefined) => {
        const base =
          current ?? (seed ? seedToCardDetail(seed) : undefined);
        if (!base) return base;
        return {
          ...base,
          members: nextMembers.map((user) => ({ user })),
        };
      },
    );
  }

  function syncLabels(nextLabels: CardDetailLabel[]) {
    setLocalLabels(nextLabels);
    onLabelsChange?.(cardId, nextLabels);
    queryClient.setQueryData(
      cardDetailQueryKey(cardId),
      (current: CardDetail | undefined) => {
        const base =
          current ?? (seed ? seedToCardDetail(seed) : undefined);
        if (!base) return base;
        return {
          ...base,
          labels: nextLabels.map((label) => ({ label })),
        };
      },
    );
  }

  function toggleMember(member: CardDetailMember, assigned: boolean) {
    if (!canEdit) return;

    const previous = activeMembers;
    const next = assigned
      ? previous.filter((user) => user.id !== member.id)
      : [...previous, member];
    syncMembers(next);

    void toggleCardMemberAction({
      cardId,
      userId: member.id,
    }).then((result) => {
      if (result.ok) return;
      syncMembers(previous);
      toast.error(result.error ?? "Could not update assignee");
    });
  }

  function toggleLabel(label: CardDetailLabel, active: boolean) {
    if (!canEdit) return;

    const previous = activeLabels;
    const next = active
      ? previous.filter((item) => item.id !== label.id)
      : [...previous, label];
    syncLabels(next);

    void toggleCardLabelAction({
      cardId,
      labelId: label.id,
    }).then((result) => {
      if (result.ok) return;
      syncLabels(previous);
      toast.error(result.error ?? "Could not update label");
    });
  }

  const detailsReady = !!card && !isPlaceholderData;
  const dueState = card
    ? getDueVisualState(card.dueDate, card.isCompleted)
    : "none";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          flushTitleAndClose();
          return;
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="flex max-h-[90vh] w-full max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        showCloseButton={false}
      >
        <DialogHeader className="space-y-1 border-b px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <DialogDescription className="text-xs">
                {card
                  ? `${card.list.board.name} · ${card.list.name}`
                  : seed
                    ? `${seed.boardName} · ${seed.listName}`
                    : "Card"}
              </DialogDescription>
              <DialogTitle className="sr-only">Card details</DialogTitle>
              {card || seed ? (
                <Input
                  value={title}
                  disabled={!canEdit || !card}
                  className="h-auto border-0 bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={() => {
                    if (titleDraft === null) return;
                    saveTitle(titleDraft);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                />
              ) : (
                <div className="h-7 w-2/3 animate-pulse rounded bg-muted" />
              )}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close"
              onClick={flushTitleAndClose}
            >
              <X className="size-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto md:grid-cols-[1fr_220px]">
          <div className="space-y-6 px-5 py-4">
            {isPending && !card ? (
              <div className="space-y-3">
                <div className="h-24 animate-pulse rounded-xl bg-muted" />
                <div className="h-32 animate-pulse rounded-xl bg-muted" />
              </div>
            ) : null}

            {card ? (
              <>
                <section className="space-y-2">
                  <h3 className="text-sm font-medium">Description</h3>
                  {detailsReady ? (
                    <CardDescriptionEditor
                      key={card.id}
                      initialContent={card.description}
                      canEdit={canEdit}
                      onSave={(json) => {
                        run(() =>
                          updateCardDetailsAction({
                            cardId: card.id,
                            description: json,
                          }),
                        );
                      }}
                    />
                  ) : (
                    <div
                      className="h-24 animate-pulse rounded-lg bg-muted/60"
                      aria-hidden
                    />
                  )}
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="size-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Checklists</h3>
                  </div>
                  {card.checklists.map((checklist) => {
                    const done = checklist.items.filter((i) => i.isCompleted)
                      .length;
                    const total = checklist.items.length;
                    return (
                      <div
                        key={checklist.id}
                        className="space-y-2 rounded-xl border p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">
                            {checklist.title}{" "}
                            <span className="text-xs font-normal text-muted-foreground">
                              {done}/{total}
                            </span>
                          </p>
                          {canEdit ? (
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() =>
                                run(() =>
                                  deleteChecklistAction({
                                    checklistId: checklist.id,
                                  }),
                                )
                              }
                            >
                              Delete
                            </Button>
                          ) : null}
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-brand transition-all"
                            style={{
                              width: `${total === 0 ? 0 : (done / total) * 100}%`,
                            }}
                          />
                        </div>
                        <ul className="space-y-1.5">
                          {checklist.items.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-center gap-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                className="size-4 rounded border-input"
                                checked={item.isCompleted}
                                disabled={!canEdit || pending}
                                onChange={(e) =>
                                  run(() =>
                                    updateChecklistItemAction({
                                      itemId: item.id,
                                      isCompleted: e.target.checked,
                                    }),
                                  )
                                }
                              />
                              <span
                                className={cn(
                                  item.isCompleted &&
                                    "text-muted-foreground line-through",
                                )}
                              >
                                {item.title}
                              </span>
                              {canEdit ? (
                                <button
                                  type="button"
                                  className="ml-auto text-xs text-muted-foreground hover:text-destructive"
                                  onClick={() =>
                                    run(() =>
                                      deleteChecklistItemAction({
                                        itemId: item.id,
                                      }),
                                    )
                                  }
                                >
                                  Remove
                                </button>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                        {canEdit ? (
                          <form
                            className="flex gap-2"
                            onSubmit={(e) => {
                              e.preventDefault();
                              const form = e.currentTarget;
                              const input = form.elements.namedItem(
                                "item",
                              ) as HTMLInputElement;
                              const value = input.value.trim();
                              if (!value) return;
                              run(async () => {
                                const result = await createChecklistItemAction({
                                  checklistId: checklist.id,
                                  title: value,
                                });
                                if (result.ok) input.value = "";
                                return result;
                              });
                            }}
                          >
                            <Input
                              name="item"
                              placeholder="Add an item"
                              className="h-8"
                            />
                            <Button type="submit" size="sm" variant="outline">
                              Add
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    );
                  })}
                  {canEdit ? (
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newChecklist.trim()) return;
                        run(async () => {
                          const result = await createChecklistAction({
                            cardId: card.id,
                            title: newChecklist.trim(),
                          });
                          if (result.ok) setNewChecklist("");
                          return result;
                        });
                      }}
                    >
                      <Input
                        value={newChecklist}
                        onChange={(e) => setNewChecklist(e.target.value)}
                        placeholder="Checklist title"
                        className="h-8"
                      />
                      <Button type="submit" size="sm">
                        Add checklist
                      </Button>
                    </form>
                  ) : null}
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Paperclip className="size-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Attachments</h3>
                  </div>
                  <ul className="space-y-2">
                    {card.attachments.map((file) => (
                      <li
                        key={file.id}
                        className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <a
                            href={attachmentUrl(file)}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate font-medium hover:underline"
                          >
                            {file.fileName}
                          </a>
                          <p className="text-xs text-muted-foreground">
                            {formatBytes(file.fileSize)} · {file.mimeType}
                          </p>
                        </div>
                        {canEdit ? (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() =>
                              run(() =>
                                deleteAttachmentAction({
                                  attachmentId: file.id,
                                }),
                              )
                            }
                          >
                            Delete
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {canEdit ? (
                    <label
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "cursor-pointer",
                      )}
                    >
                      Upload file
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > MAX_UPLOAD_BYTES) {
                            toast.error("File exceeds the 10 MB size limit.");
                            e.target.value = "";
                            return;
                          }
                          const body = new FormData();
                          body.set("cardId", card.id);
                          body.set("file", file);
                          run(() => uploadAttachmentAction(body));
                          e.target.value = "";
                        }}
                      />
                    </label>
                  ) : null}
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-medium">Comments</h3>
                  <ul className="space-y-3">
                    {card.comments.map((item) => (
                      <li key={item.id} className="flex gap-2">
                        <Avatar className="size-8">
                          {item.user.image ? (
                            <AvatarImage src={item.user.image} alt="" />
                          ) : null}
                          <AvatarFallback>
                            {initials(item.user.name, item.user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 rounded-lg border px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">
                              {item.user.name ?? item.user.email}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {formatDistanceToNow(new Date(item.createdAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-sm">
                            {item.body}
                          </p>
                          {item.userId === currentUserId || canEdit ? (
                            <button
                              type="button"
                              className="mt-1 text-xs text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                run(() =>
                                  deleteCommentAction({ commentId: item.id }),
                                )
                              }
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {canEdit ? (
                    <form
                      className="space-y-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!comment.trim()) return;
                        run(async () => {
                          const result = await createCommentAction({
                            cardId: card.id,
                            body: comment.trim(),
                          });
                          if (result.ok) setComment("");
                          return result;
                        });
                      }}
                    >
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        placeholder="Write a comment…"
                        className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      />
                      <Button type="submit" size="sm" disabled={pending}>
                        Comment
                      </Button>
                    </form>
                  ) : null}
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-medium">Activity</h3>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {card.activities.map((activity) => (
                      <li key={activity.id}>
                        {(activity.actor.name ?? activity.actor.email) +
                          ` ${activity.action.toLowerCase()} ${activity.entityType}`}
                        {" · "}
                        {formatDistanceToNow(new Date(activity.createdAt), {
                          addSuffix: true,
                        })}
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            ) : null}
          </div>

          <aside className="space-y-5 border-t bg-muted/20 px-4 py-4 md:border-t-0 md:border-l">
            {card ? (
              <>
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Users className="size-3.5" /> Members
                  </p>
                  {boardContext.workspaceMembers.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No workspace members to assign.{" "}
                      <Link
                        href={`/workspaces/${boardContext.workspaceId}`}
                        className="font-medium text-foreground underline-offset-2 hover:underline"
                      >
                        Invite people
                      </Link>
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {boardContext.workspaceMembers.map((member) => {
                        const assigned = activeMembers.some(
                          (m) => m.id === member.id,
                        );
                        return (
                          <li key={member.id}>
                            <button
                              type="button"
                              disabled={!canEdit}
                              aria-pressed={assigned}
                              aria-label={
                                assigned
                                  ? `Unassign ${member.name ?? member.email}`
                                  : `Assign ${member.name ?? member.email}`
                              }
                              className={cn(
                                "flex w-full cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-sm transition-colors hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-60",
                                assigned && "bg-brand/10",
                              )}
                              onClick={() => toggleMember(member, assigned)}
                            >
                              <Avatar className="size-7">
                                {member.image ? (
                                  <AvatarImage src={member.image} alt="" />
                                ) : null}
                                <AvatarFallback className="text-[10px]">
                                  {initials(member.name, member.email)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="min-w-0 flex-1 truncate">
                                {member.name ?? member.email}
                                {member.id === currentUserId ? (
                                  <span className="text-muted-foreground">
                                    {" "}
                                    (you)
                                  </span>
                                ) : null}
                              </span>
                              <span
                                className={cn(
                                  "flex size-5 shrink-0 items-center justify-center rounded border",
                                  assigned
                                    ? "border-brand bg-brand text-brand-foreground"
                                    : "border-input bg-background",
                                )}
                                aria-hidden
                              >
                                {assigned ? (
                                  <Check className="size-3.5" />
                                ) : null}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {canEdit ? (
                    <p className="text-[11px] text-muted-foreground">
                      Click a person to assign or unassign. Invite more from the{" "}
                      <Link
                        href={`/workspaces/${boardContext.workspaceId}`}
                        className="underline-offset-2 hover:underline"
                      >
                        workspace
                      </Link>
                      .
                    </p>
                  ) : null}
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Tag className="size-3.5" /> Labels
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {boardLabels.map((label) => {
                      const active = activeLabels.some(
                        (item) => item.id === label.id,
                      );
                      return (
                        <button
                          key={label.id}
                          type="button"
                          disabled={!canEdit}
                          aria-pressed={active}
                          className={cn(
                            "cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-white transition-opacity disabled:cursor-not-allowed",
                            !active && "opacity-40",
                          )}
                          style={{ backgroundColor: label.color }}
                          onClick={() => toggleLabel(label, active)}
                        >
                          {label.name}
                        </button>
                      );
                    })}
                  </div>
                  {canEdit ? (
                    <div className="space-y-2 pt-1">
                      <Input
                        value={newLabelName}
                        onChange={(e) => setNewLabelName(e.target.value)}
                        placeholder="New label"
                        className="h-8"
                      />
                      <div className="flex flex-wrap gap-1">
                        {LABEL_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={cn(
                              "size-5 cursor-pointer rounded-full",
                              newLabelColor === color &&
                                "ring-2 ring-offset-2 ring-foreground",
                            )}
                            style={{ backgroundColor: color }}
                            onClick={() => setNewLabelColor(color)}
                          />
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="cursor-pointer"
                        disabled={!newLabelName.trim() || pending}
                        onClick={() => {
                          const name = newLabelName.trim();
                          if (!name || !card) return;
                          startTransition(async () => {
                            const created = await createLabelAction({
                              boardId: card.list.board.id,
                              name,
                              color: newLabelColor,
                            });
                            if (!created.ok) {
                              toast.error(created.error);
                              return;
                            }
                            setNewLabelName("");
                            if (!created.id) return;
                            const label = {
                              id: created.id,
                              name,
                              color: newLabelColor,
                            };
                            setCreatedLabels((prev) => [...prev, label]);
                            syncLabels([...activeLabels, label]);
                            const toggle = await toggleCardLabelAction({
                              cardId: card.id,
                              labelId: created.id,
                            });
                            if (!toggle.ok) {
                              syncLabels(activeLabels);
                              toast.error(toggle.error);
                            }
                          });
                        }}
                      >
                        Add label
                      </Button>
                    </div>
                  ) : null}
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Calendar className="size-3.5" /> Due date
                  </p>
                  {card.dueDate ? (
                    <p
                      className={cn(
                        "rounded-md px-2 py-1 text-xs font-medium",
                        dueState === "overdue" &&
                          "bg-destructive/15 text-destructive",
                        dueState === "soon" && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                        dueState === "completed" &&
                          "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                        dueState === "normal" && "bg-muted",
                      )}
                    >
                      {formatDueDate(card.dueDate)}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">No due date</p>
                  )}
                  {canEdit ? (
                    <div className="space-y-2">
                      <Label htmlFor="due-date" className="sr-only">
                        Due date
                      </Label>
                      <Input
                        id="due-date"
                        type="datetime-local"
                        className="h-8"
                        defaultValue={toDatetimeLocalValue(card.dueDate)}
                        onBlur={(e) => {
                          const iso = fromDatetimeLocalValue(e.target.value);
                          const current = card.dueDate
                            ? new Date(card.dueDate).toISOString()
                            : null;
                          if (iso === current) return;
                          run(() =>
                            updateCardDetailsAction({
                              cardId: card.id,
                              dueDate: iso,
                            }),
                          );
                        }}
                      />
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          className="size-4 rounded border-input"
                          checked={card.isCompleted}
                          onChange={(e) =>
                            run(() =>
                              updateCardDetailsAction({
                                cardId: card.id,
                                isCompleted: e.target.checked,
                              }),
                            )
                          }
                        />
                        Mark complete
                      </label>
                      {card.dueDate ? (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() =>
                            run(() =>
                              updateCardDetailsAction({
                                cardId: card.id,
                                dueDate: null,
                              }),
                            )
                          }
                        >
                          Clear due date
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
