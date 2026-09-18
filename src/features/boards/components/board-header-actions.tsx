"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteBoardAction,
  updateBoardAction,
} from "@/features/boards/actions";
import {
  updateBoardSchema,
  type UpdateBoardInput,
} from "@/features/boards/schemas";
import { cn } from "@/lib/utils";

interface BoardMenuProps {
  board: { id: string; name: string; description: string | null };
  canEdit: boolean;
  canDelete: boolean;
}

export function BoardHeaderActions({
  board,
  canEdit,
  canDelete,
}: BoardMenuProps) {
  return (
    <div className="flex items-center gap-1.5">
      {canEdit ? <EditBoardDialog board={board} /> : null}
      {canDelete ? (
        <DeleteBoardButton boardId={board.id} boardName={board.name} />
      ) : null}
    </div>
  );
}

function EditBoardDialog({
  board,
}: {
  board: { id: string; name: string; description: string | null };
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<UpdateBoardInput>({
    resolver: zodResolver(updateBoardSchema),
    defaultValues: {
      boardId: board.id,
      name: board.name,
      description: board.description ?? "",
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
        aria-label="Edit board"
      >
        <Pencil className="size-3.5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit board</DialogTitle>
          <DialogDescription>Rename or update the description.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) => {
            startTransition(async () => {
              const result = await updateBoardAction(values);
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              toast.success("Board updated");
              setOpen(false);
            });
          })}
          className="flex flex-col gap-4"
        >
          <input type="hidden" {...form.register("boardId")} />
          <div className="space-y-2">
            <Label htmlFor="edit-board-name">Name</Label>
            <Input id="edit-board-name" {...form.register("name")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-board-desc">Description</Label>
            <textarea
              id="edit-board-desc"
              rows={2}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              {...form.register("description")}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteBoardButton({
  boardId,
  boardName,
}: {
  boardId: string;
  boardName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "text-destructive",
        )}
        aria-label="Delete board"
      >
        <Trash2 className="size-3.5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete board?</DialogTitle>
          <DialogDescription>
            This permanently deletes <strong>{boardName}</strong> and all lists
            and cards.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await deleteBoardAction({ boardId });
                if (result && !result.ok) toast.error(result.error);
              });
            }}
          >
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
