import { z } from "zod";

export const createBoardFromTemplateSchema = z.object({
  templateId: z.string().min(1),
  workspaceId: z.string().min(1),
  name: z.string().min(1, "Name is required").max(100).optional(),
  description: z.string().max(500).optional().or(z.literal("")),
});

export type CreateBoardFromTemplateInput = z.infer<
  typeof createBoardFromTemplateSchema
>;
