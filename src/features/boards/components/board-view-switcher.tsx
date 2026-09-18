"use client";

import { CalendarDays, LayoutGrid, Table2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { BoardViewMode } from "@/features/boards/views";
import { cn } from "@/lib/utils";

const VIEWS: {
  id: BoardViewMode;
  label: string;
  icon: typeof LayoutGrid;
}[] = [
  { id: "board", label: "Board", icon: LayoutGrid },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "table", label: "Table", icon: Table2 },
];

interface BoardViewSwitcherProps {
  value: BoardViewMode;
  onChange: (view: BoardViewMode) => void;
}

export function BoardViewSwitcher({ value, onChange }: BoardViewSwitcherProps) {
  return (
    <div
      className="inline-flex rounded-lg border bg-background p-0.5"
      role="tablist"
      aria-label="Board view"
    >
      {VIEWS.map((view) => {
        const Icon = view.icon;
        const active = value === view.id;
        return (
          <button
            key={view.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "gap-1.5 rounded-md px-2.5",
              active && "bg-muted text-foreground shadow-sm",
            )}
            onClick={() => onChange(view.id)}
          >
            <Icon className="size-3.5" />
            <span className="hidden sm:inline">{view.label}</span>
          </button>
        );
      })}
    </div>
  );
}
