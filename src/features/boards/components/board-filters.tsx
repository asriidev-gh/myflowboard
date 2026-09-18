"use client";

import { Filter, X } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDueVisualState } from "@/features/cards/due-date";
import type { BoardCardContext } from "@/features/cards/types";
import { cn } from "@/lib/utils";

export type BoardFiltersState = {
  memberIds: string[];
  labelIds: string[];
  due: "any" | "overdue" | "soon" | "none";
  completed: "any" | "open" | "done";
};

export const EMPTY_BOARD_FILTERS: BoardFiltersState = {
  memberIds: [],
  labelIds: [],
  due: "any",
  completed: "any",
};

export function isBoardFiltersActive(filters: BoardFiltersState) {
  return (
    filters.memberIds.length > 0 ||
    filters.labelIds.length > 0 ||
    filters.due !== "any" ||
    filters.completed !== "any"
  );
}

type FilterableCard = {
  dueDate?: string | Date | null;
  isCompleted?: boolean;
  labels?: { id: string }[];
  members?: { id: string }[];
};

export function cardMatchesFilters(
  card: FilterableCard,
  filters: BoardFiltersState,
): boolean {
  if (
    filters.memberIds.length > 0 &&
    !filters.memberIds.some((id) =>
      card.members?.some((member) => member.id === id),
    )
  ) {
    return false;
  }

  if (
    filters.labelIds.length > 0 &&
    !filters.labelIds.some((id) =>
      card.labels?.some((label) => label.id === id),
    )
  ) {
    return false;
  }

  if (filters.completed === "open" && card.isCompleted) return false;
  if (filters.completed === "done" && !card.isCompleted) return false;

  if (filters.due !== "any") {
    const dueState = getDueVisualState(card.dueDate, !!card.isCompleted);
    if (filters.due === "none" && dueState !== "none") return false;
    if (filters.due === "overdue" && dueState !== "overdue") return false;
    if (filters.due === "soon" && dueState !== "soon") return false;
  }

  return true;
}

interface BoardFiltersProps {
  filters: BoardFiltersState;
  onChange: (next: BoardFiltersState) => void;
  members: BoardCardContext["workspaceMembers"];
  labels: BoardCardContext["boardLabels"];
}

export function BoardFilters({
  filters,
  onChange,
  members,
  labels,
}: BoardFiltersProps) {
  const active = isBoardFiltersActive(filters);

  function toggleMember(id: string) {
    onChange({
      ...filters,
      memberIds: filters.memberIds.includes(id)
        ? filters.memberIds.filter((m) => m !== id)
        : [...filters.memberIds, id],
    });
  }

  function toggleLabel(id: string) {
    onChange({
      ...filters,
      labelIds: filters.labelIds.includes(id)
        ? filters.labelIds.filter((l) => l !== id)
        : [...filters.labelIds, id],
    });
  }

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: active ? "secondary" : "outline", size: "sm" }),
            "gap-1.5",
          )}
        >
          <Filter className="size-3.5" />
          Filter
          {active ? (
            <span className="rounded-full bg-brand/15 px-1.5 text-[10px] font-semibold text-brand">
              {[
                filters.memberIds.length,
                filters.labelIds.length,
                filters.due !== "any" ? 1 : 0,
                filters.completed !== "any" ? 1 : 0,
              ].reduce((a, b) => a + b, 0)}
            </span>
          ) : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Members</DropdownMenuLabel>
            {members.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                No members
              </p>
            ) : (
              members.map((member) => (
                <DropdownMenuCheckboxItem
                  key={member.id}
                  checked={filters.memberIds.includes(member.id)}
                  onCheckedChange={() => toggleMember(member.id)}
                >
                  {member.name ?? member.email}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Labels</DropdownMenuLabel>
            {labels.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                No labels
              </p>
            ) : (
              labels.map((label) => (
                <DropdownMenuCheckboxItem
                  key={label.id}
                  checked={filters.labelIds.includes(label.id)}
                  onCheckedChange={() => toggleLabel(label.id)}
                >
                  <span
                    className="mr-1.5 inline-block size-2.5 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  {label.name}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Due date</DropdownMenuLabel>
            {(
              [
                ["any", "Any"],
                ["overdue", "Overdue"],
                ["soon", "Due soon"],
                ["none", "No due date"],
              ] as const
            ).map(([value, label]) => (
              <DropdownMenuCheckboxItem
                key={value}
                checked={filters.due === value}
                onCheckedChange={() =>
                  onChange({ ...filters, due: value })
                }
              >
                {label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            {(
              [
                ["any", "Any"],
                ["open", "Open"],
                ["done", "Completed"],
              ] as const
            ).map(([value, label]) => (
              <DropdownMenuCheckboxItem
                key={value}
                checked={filters.completed === value}
                onCheckedChange={() =>
                  onChange({ ...filters, completed: value })
                }
              >
                {label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {active ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Clear filters"
          onClick={() => onChange(EMPTY_BOARD_FILTERS)}
        >
          <X className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
