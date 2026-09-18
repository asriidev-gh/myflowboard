import { format, isBefore, isToday, addHours } from "date-fns";

export type DueVisualState = "none" | "normal" | "soon" | "overdue" | "completed";

export function getDueVisualState(
  dueDate: Date | string | null | undefined,
  isCompleted: boolean,
): DueVisualState {
  if (!dueDate) return "none";
  if (isCompleted) return "completed";

  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const now = new Date();

  if (isBefore(due, now) && !isToday(due)) return "overdue";
  if (isBefore(due, addHours(now, 24))) return "soon";
  return "normal";
}

export function formatDueDate(dueDate: Date | string) {
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  return format(due, "MMM d, yyyy · h:mm a");
}

export function toDatetimeLocalValue(dueDate: Date | string | null | undefined) {
  if (!dueDate) return "";
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}T${pad(due.getHours())}:${pad(due.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
