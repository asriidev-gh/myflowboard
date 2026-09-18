"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { getDueVisualState } from "@/features/cards/due-date";
import type { FlatBoardCard } from "@/features/boards/views";
import { cn } from "@/lib/utils";

interface BoardCalendarViewProps {
  cards: FlatBoardCard[];
  onOpenCard: (cardId: string) => void;
}

function dayKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function BoardCalendarView({
  cards,
  onOpenCard,
}: BoardCalendarViewProps) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const { days, byDay, undated } = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start, end });

    const byDay = new Map<string, FlatBoardCard[]>();
    const undated: FlatBoardCard[] = [];

    for (const card of cards) {
      if (!card.dueDate) {
        undated.push(card);
        continue;
      }
      const due =
        typeof card.dueDate === "string"
          ? new Date(card.dueDate)
          : card.dueDate;
      const key = dayKey(due);
      const bucket = byDay.get(key) ?? [];
      bucket.push(card);
      byDay.set(key, bucket);
    }

    return { days, byDay, undated };
  }, [cards, month]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            {format(month, "MMMM yyyy")}
          </h2>
          <p className="text-xs text-muted-foreground">
            Cards placed by due date
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Previous month"
            onClick={() => setMonth((current) => subMonths(current, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMonth(startOfMonth(new Date()))}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Next month"
            onClick={() => setMonth((current) => addMonths(current, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border bg-border text-[10px] sm:text-[11px]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
          <div
            key={label}
            className="bg-muted/60 px-1 py-1.5 text-center font-medium text-muted-foreground sm:px-2"
          >
            <span className="sm:hidden">{label.slice(0, 1)}</span>
            <span className="hidden sm:inline">{label}</span>
          </div>
        ))}
        {days.map((day) => {
          const key = dayKey(day);
          const dayCards = byDay.get(key) ?? [];
          const inMonth = isSameMonth(day, month);
          return (
            <div
              key={key}
              className={cn(
                "min-h-20 bg-background p-1 sm:min-h-28 sm:p-1.5",
                !inMonth && "bg-muted/20 text-muted-foreground",
                isToday(day) && "ring-1 ring-inset ring-brand/40",
              )}
            >
              <div className="mb-1 flex items-center justify-between px-0.5">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs",
                    isToday(day) && "bg-brand text-brand-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
                {dayCards.length > 0 ? (
                  <span className="text-[10px] text-muted-foreground">
                    {dayCards.length}
                  </span>
                ) : null}
              </div>
              <ul className="space-y-1">
                {dayCards.slice(0, 3).map((card) => {
                  const dueState = getDueVisualState(
                    card.dueDate,
                    !!card.isCompleted,
                  );
                  return (
                    <li key={card.id}>
                      <button
                        type="button"
                        className={cn(
                          "w-full truncate rounded-md border bg-card px-1.5 py-1 text-left text-[11px] font-medium shadow-sm hover:bg-accent/50",
                          dueState === "overdue" && "border-destructive/40",
                          dueState === "completed" && "opacity-70",
                        )}
                        title={`${card.title} · ${card.listName}`}
                        onClick={() => onOpenCard(card.id)}
                      >
                        {card.title}
                      </button>
                    </li>
                  );
                })}
                {dayCards.length > 3 ? (
                  <li className="px-1 text-[10px] text-muted-foreground">
                    +{dayCards.length - 3} more
                  </li>
                ) : null}
              </ul>
            </div>
          );
        })}
      </div>

      {undated.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">No due date</h3>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {undated.map((card) => (
              <li key={card.id}>
                <button
                  type="button"
                  className="flex w-full flex-col gap-0.5 rounded-lg border bg-card px-3 py-2 text-left shadow-sm hover:bg-accent/40"
                  onClick={() => onOpenCard(card.id)}
                >
                  <span className="truncate text-sm font-medium">
                    {card.title}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {card.listName}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
