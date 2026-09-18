"use client";

import { useMemo, useState } from "react";

import {
  formatDueDate,
  getDueVisualState,
} from "@/features/cards/due-date";
import type { FlatBoardCard } from "@/features/boards/views";
import { cn } from "@/lib/utils";

type SortKey = "title" | "list" | "due" | "status";

interface BoardTableViewProps {
  cards: FlatBoardCard[];
  onOpenCard: (cardId: string) => void;
}

function statusLabel(card: FlatBoardCard) {
  if (card.isCompleted) return "Completed";
  const due = getDueVisualState(card.dueDate, !!card.isCompleted);
  if (due === "overdue") return "Overdue";
  if (due === "soon") return "Due soon";
  if (due === "none") return "Open";
  return "Open";
}

export function BoardTableView({ cards, onOpenCard }: BoardTableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("due");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    const next = [...cards];
    const dir = sortDir === "asc" ? 1 : -1;
    next.sort((a, b) => {
      if (sortKey === "title") {
        return a.title.localeCompare(b.title) * dir;
      }
      if (sortKey === "list") {
        return a.listName.localeCompare(b.listName) * dir;
      }
      if (sortKey === "status") {
        return statusLabel(a).localeCompare(statusLabel(b)) * dir;
      }
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      return (aDue - bDue) * dir;
    });
    return next;
  }, [cards, sortDir, sortKey]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          No cards match the current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
            <tr className="border-b text-left text-xs text-muted-foreground">
              <SortHeader
                label="Card"
                active={sortKey === "title"}
                dir={sortDir}
                onClick={() => toggleSort("title")}
              />
              <SortHeader
                label="List"
                active={sortKey === "list"}
                dir={sortDir}
                onClick={() => toggleSort("list")}
              />
              <th className="px-3 py-2.5 font-medium">Members</th>
              <th className="px-3 py-2.5 font-medium">Labels</th>
              <SortHeader
                label="Due date"
                active={sortKey === "due"}
                dir={sortDir}
                onClick={() => toggleSort("due")}
              />
              <SortHeader
                label="Status"
                active={sortKey === "status"}
                dir={sortDir}
                onClick={() => toggleSort("status")}
              />
            </tr>
          </thead>
          <tbody>
            {sorted.map((card) => {
              const dueState = getDueVisualState(
                card.dueDate,
                !!card.isCompleted,
              );
              return (
                <tr
                  key={card.id}
                  className="cursor-pointer border-b last:border-b-0 hover:bg-accent/40"
                  onClick={() => onOpenCard(card.id)}
                >
                  <td className="px-3 py-2.5 font-medium">{card.title}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {card.listName}
                  </td>
                  <td className="px-3 py-2.5">
                    {card.members && card.members.length > 0 ? (
                      <div className="flex -space-x-1.5">
                        {card.members.slice(0, 4).map((member) => (
                          <span
                            key={member.id}
                            className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium ring-1 ring-background"
                            title={member.name ?? member.email}
                          >
                            {(member.name ?? member.email)
                              .slice(0, 1)
                              .toUpperCase()}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {card.labels && card.labels.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {card.labels.map((label) => (
                          <span
                            key={label.id}
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                            style={{ backgroundColor: label.color }}
                          >
                            {label.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {card.dueDate ? (
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[11px] font-medium",
                          dueState === "overdue" &&
                            "bg-destructive/15 text-destructive",
                          dueState === "soon" &&
                            "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                          dueState === "completed" &&
                            "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                          dueState === "normal" &&
                            "bg-muted text-muted-foreground",
                        )}
                      >
                        {formatDueDate(card.dueDate)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {statusLabel(card)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <th className="px-3 py-2.5 font-medium">
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          active && "text-foreground",
        )}
        onClick={onClick}
      >
        {label}
        {active ? (
          <span className="text-[10px]">{dir === "asc" ? "↑" : "↓"}</span>
        ) : null}
      </button>
    </th>
  );
}
