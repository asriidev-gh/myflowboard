"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
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
import { createBoardAction } from "@/features/boards/actions";
import {
  createBoardSchema,
  type CreateBoardInput,
} from "@/features/boards/schemas";
import { cn } from "@/lib/utils";

interface CreateBoardDialogProps {
  workspaceId: string;
  triggerLabel?: string;
  triggerClassName?: string;
}

export function CreateBoardDialog({
  workspaceId,
  triggerLabel = "New board",
  triggerClassName,
}: CreateBoardDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<CreateBoardInput>({
    resolver: zodResolver(createBoardSchema),
    defaultValues: {
      workspaceId,
      name: "",
      description: "",
      withDefaultLists: true,
    },
  });

  function onSubmit(values: CreateBoardInput) {
    startTransition(async () => {
      const result = await createBoardAction({
        ...values,
        withDefaultLists: values.withDefaultLists ?? true,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Created");
      setOpen(false);
      form.reset({
        workspaceId,
        name: "",
        description: "",
        withDefaultLists: true,
      });
      if (result.id) {
        router.push(`/boards/${result.id}`);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(buttonVariants({ size: "sm" }), triggerClassName)}
      >
        <Plus className="size-4" />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create board</DialogTitle>
          <DialogDescription>
            Boards hold lists and cards for a project stream.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <input type="hidden" {...form.register("workspaceId")} />
          <div className="space-y-2">
            <Label htmlFor="board-name">Name</Label>
            <Input
              id="board-name"
              placeholder="Product Development"
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="board-description">Description</Label>
            <textarea
              id="board-description"
              rows={2}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              {...form.register("description")}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-input"
              {...form.register("withDefaultLists")}
            />
            Start with Backlog / To Do / In Progress / Done
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create board"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
