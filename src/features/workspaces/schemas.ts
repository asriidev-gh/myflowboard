import { z } from "zod";

export const assignableRoleSchema = z.enum(["ADMIN", "MEMBER", "GUEST"]);

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name is too long"),
  description: z.string().max(500).optional().or(z.literal("")),
});

export const updateWorkspaceSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional().or(z.literal("")),
});

export const deleteWorkspaceSchema = z.object({
  workspaceId: z.string().min(1),
});

export const inviteMemberSchema = z.object({
  workspaceId: z.string().min(1),
  email: z.string().email("Enter a valid email"),
  role: assignableRoleSchema,
});

export const updateMemberRoleSchema = z.object({
  workspaceId: z.string().min(1),
  memberId: z.string().min(1),
  role: assignableRoleSchema,
});

export const removeMemberSchema = z.object({
  workspaceId: z.string().min(1),
  memberId: z.string().min(1),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
