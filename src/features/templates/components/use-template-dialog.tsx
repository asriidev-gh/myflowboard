"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBoardFromTemplateAction } from "@/features/templates/actions";
import type { BoardTemplate } from "@/features/templates/catalog";

export type TemplateWorkspaceOption = {
  id: string;
  name: string;
};

interface UseTemplateDialogProps {
  template: BoardTemplate | null;
  workspaces: TemplateWorkspaceOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UseTemplateDialog({
  template,
  workspaces,
  open,
  onOpenChange,
}: UseTemplateDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open || !template) return;
    setName(template.name);
    setWorkspaceId((current) => current || workspaces[0]?.id || "");
  }, [open, template, workspaces]);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!template) return;

    if (!workspaceId) {
      toast.error("Create a workspace first, then use a template.");
      return;
    }

    startTransition(async () => {
      const result = await createBoardFromTemplateAction({
        templateId: template.id,
        workspaceId,
        name: name.trim() || template.name,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Board created");
      onOpenChange(false);
      if (result.id) {
        router.push(`/boards/${result.id}`);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Use template</DialogTitle>
          <DialogDescription>
            {template
              ? `Create a board from “${template.name}” with its lists and labels.`
              : "Choose a template to continue."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="template-board-name">Board name</Label>
            <Input
              id="template-board-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={template?.name ?? "Board name"}
              required
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-workspace">Workspace</Label>
            {workspaces.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You need a workspace before creating a board.{" "}
                <button
                  type="button"
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                  onClick={() => router.push("/workspaces")}
                >
                  Create one
                </button>
              </p>
            ) : (
              <select
                id="template-workspace"
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                required
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending || !template || workspaces.length === 0}
            >
              {pending ? "Creating…" : "Create board"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
