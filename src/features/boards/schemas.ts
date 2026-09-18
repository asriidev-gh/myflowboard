import { z } from "zod";

export const createBoardSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  withDefaultLists: z.boolean().optional(),
});

export const updateBoardSchema = z.object({
  boardId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().or(z.literal("")),
});

export const boardIdSchema = z.object({
  boardId: z.string().min(1),
});

export const createListSchema = z.object({
  boardId: z.string().min(1),
  name: z.string().min(1, "List name is required").max(100),
});

export const updateListSchema = z.object({
  listId: z.string().min(1),
  name: z.string().min(1).max(100),
});

export const listIdSchema = z.object({
  listId: z.string().min(1),
});

export const createCardSchema = z.object({
  listId: z.string().min(1),
  title: z.string().min(1, "Title is required").max(200),
});

export const updateCardSchema = z.object({
  cardId: z.string().min(1),
  title: z.string().min(1).max(200),
});

export const cardIdSchema = z.object({
  cardId: z.string().min(1),
});

export const moveCardSchema = z.object({
  cardId: z.string().min(1),
  targetListId: z.string().min(1),
});

export const reorderListSchema = z.object({
  boardId: z.string().min(1),
  listId: z.string().min(1),
  beforeListId: z.string().nullable(),
  afterListId: z.string().nullable(),
});

export const reorderCardSchema = z.object({
  cardId: z.string().min(1),
  targetListId: z.string().min(1),
  beforeCardId: z.string().nullable(),
  afterCardId: z.string().nullable(),
});

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
export type CreateListInput = z.infer<typeof createListSchema>;
export type UpdateListInput = z.infer<typeof updateListSchema>;
export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type ReorderListInput = z.infer<typeof reorderListSchema>;
export type ReorderCardInput = z.infer<typeof reorderCardSchema>;
