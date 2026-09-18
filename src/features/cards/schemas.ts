import { z } from "zod";

export const cardIdSchema = z.object({
  cardId: z.string().min(1),
});

export const updateCardDetailsSchema = z.object({
  cardId: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  description: z.any().optional().nullable(),
  dueDate: z.string().nullable().optional(),
  dueReminder: z.string().nullable().optional(),
  isCompleted: z.boolean().optional(),
});

export const toggleCardMemberSchema = z.object({
  cardId: z.string().min(1),
  userId: z.string().min(1),
});

export const createLabelSchema = z.object({
  boardId: z.string().min(1),
  name: z.string().min(1).max(40),
  color: z.string().min(4).max(20),
});

export const toggleCardLabelSchema = z.object({
  cardId: z.string().min(1),
  labelId: z.string().min(1),
});

export const createChecklistSchema = z.object({
  cardId: z.string().min(1),
  title: z.string().min(1).max(100),
});

export const updateChecklistSchema = z.object({
  checklistId: z.string().min(1),
  title: z.string().min(1).max(100),
});

export const checklistIdSchema = z.object({
  checklistId: z.string().min(1),
});

export const createChecklistItemSchema = z.object({
  checklistId: z.string().min(1),
  title: z.string().min(1).max(200),
});

export const updateChecklistItemSchema = z.object({
  itemId: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  isCompleted: z.boolean().optional(),
});

export const checklistItemIdSchema = z.object({
  itemId: z.string().min(1),
});

export const createCommentSchema = z.object({
  cardId: z.string().min(1),
  body: z.string().min(1).max(5000),
});

export const updateCommentSchema = z.object({
  commentId: z.string().min(1),
  body: z.string().min(1).max(5000),
});

export const commentIdSchema = z.object({
  commentId: z.string().min(1),
});

export const attachmentIdSchema = z.object({
  attachmentId: z.string().min(1),
});

export const LABEL_COLORS = [
  "#0f766e",
  "#0369a1",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#475569",
] as const;
