"use client";

import { useTransition } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/ui/button";
import { toggleBoardStarAction } from "@/features/boards/actions";
import { cn } from "@/lib/utils";

interface StarBoardButtonProps {
  boardId: string;
  isStarred: boolean;
}

export function StarBoardButton({ boardId, isStarred }: StarBoardButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={isStarred ? "Unstar board" : "Star board"}
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon-sm" }),
        isStarred && "text-amber-500",
      )}
      onClick={() => {
        startTransition(async () => {
          const result = await toggleBoardStarAction({ boardId });
          if (!result.ok) toast.error(result.error);
        });
      }}
    >
      <Star className={cn("size-4", isStarred && "fill-current")} />
    </button>
  );
}
