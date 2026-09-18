import Link from "next/link";
import { CheckSquare } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import {
  formatDueDate,
  getDueVisualState,
} from "@/features/cards/due-date";
import {
  groupMyWorkCards,
  type MyWorkCard,
  type MyWorkGroupKey,
} from "@/features/my-work/queries";
import { cn } from "@/lib/utils";

const GROUP_META: Record<
  MyWorkGroupKey,
  { title: string; empty: string }
> = {
  overdue: { title: "Overdue", empty: "Nothing overdue." },
  today: { title: "Due today", empty: "Nothing due today." },
  upcoming: { title: "Upcoming", empty: "No upcoming due dates." },
  none: { title: "No due date / completed", empty: "No other assigned cards." },
};

const GROUP_ORDER: MyWorkGroupKey[] = [
  "overdue",
  "today",
  "upcoming",
  "none",
];

export function MyWorkList({ cards }: { cards: MyWorkCard[] }) {
  const groups = groupMyWorkCards(cards);

  if (cards.length === 0) {
    return (
      <EmptyState
        icon={CheckSquare}
        title="No cards assigned to you"
        description="When someone assigns you to a card, it will show up here grouped by due date."
      />
    );
  }

  return (
    <div className="space-y-6">
      {GROUP_ORDER.map((key) => {
        const items = groups[key];
        const meta = GROUP_META[key];
        return (
          <section key={key} className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-heading text-sm font-semibold tracking-tight">
                {meta.title}
              </h2>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground">{meta.empty}</p>
            ) : (
              <ul className="space-y-2">
                {items.map((card) => (
                  <MyWorkCardRow key={card.id} card={card} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function MyWorkCardRow({ card }: { card: MyWorkCard }) {
  const dueState = getDueVisualState(card.dueDate, card.isCompleted);

  return (
    <li>
      <Link
        href={`/boards/${card.boardId}?card=${card.id}`}
        className="block rounded-xl border bg-card px-3 py-2.5 transition-colors hover:bg-accent/40"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-medium">{card.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {card.workspaceName} · {card.boardName} · {card.listName}
            </p>
            {card.labels.length > 0 ? (
              <div className="flex flex-wrap gap-1 pt-0.5">
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
            ) : null}
          </div>
          {card.dueDate ? (
            <span
              className={cn(
                "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                dueState === "overdue" &&
                  "bg-destructive/15 text-destructive",
                dueState === "soon" &&
                  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                dueState === "completed" &&
                  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                dueState === "normal" && "bg-muted text-muted-foreground",
              )}
            >
              {formatDueDate(card.dueDate)}
            </span>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
