"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  canAssignRole,
  canDeleteWorkspace,
  canInviteMembers,
  canManageWorkspace,
  canModifyMember,
} from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { slugify, uniqueSlugCandidate } from "@/lib/workspaces/slug";
import {
  createWorkspaceSchema,
  deleteWorkspaceSchema,
  inviteMemberSchema,
  removeMemberSchema,
  updateMemberRoleSchema,
  updateWorkspaceSchema,
} from "@/features/workspaces/schemas";
import {
  requireMembership,
  requireUserId,
} from "@/features/workspaces/queries";
import { notifyUser } from "@/features/notifications/notify";

export type ActionResult =
  | { ok: true; message?: string; workspaceId?: string }
  | { ok: false; error: string };

async function allocateSlug(name: string) {
  const base = slugify(name);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = uniqueSlugCandidate(base, attempt);
    const existing = await prisma.workspace.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createWorkspaceAction(
  input: unknown,
): Promise<ActionResult> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: "You must be signed in." };
  }

  const parsed = createWorkspaceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const name = parsed.data.name.trim();
  const description = parsed.data.description?.trim() || null;
  const slug = await allocateSlug(name);

  const workspace = await prisma.workspace.create({
    data: {
      name,
      slug,
      description,
      createdById: userId,
      members: {
        create: {
          userId,
          role: "OWNER",
        },
      },
    },
  });

  await prisma.activity.create({
    data: {
      workspaceId: workspace.id,
      actorId: userId,
      action: "CREATED",
      entityType: "workspace",
      entityId: workspace.id,
      metadata: { name },
    },
  });

  revalidatePath("/workspaces");
  revalidatePath("/dashboard");
  return { ok: true, workspaceId: workspace.id, message: "Workspace created." };
}

export async function updateWorkspaceAction(
  input: unknown,
): Promise<ActionResult> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: "You must be signed in." };
  }

  const parsed = updateWorkspaceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  let membership;
  try {
    membership = await requireMembership(parsed.data.workspaceId, userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  if (!canManageWorkspace(membership.role)) {
    return { ok: false, error: "Only owners and admins can edit this workspace." };
  }

  const name = parsed.data.name.trim();
  const description = parsed.data.description?.trim() || null;

  await prisma.$transaction([
    prisma.workspace.update({
      where: { id: parsed.data.workspaceId },
      data: { name, description },
    }),
    prisma.activity.create({
      data: {
        workspaceId: parsed.data.workspaceId,
        actorId: userId,
        action: "UPDATED",
        entityType: "workspace",
        entityId: parsed.data.workspaceId,
        metadata: { name },
      },
    }),
  ]);

  revalidatePath("/workspaces");
  revalidatePath(`/workspaces/${parsed.data.workspaceId}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "Workspace updated." };
}

export async function deleteWorkspaceAction(
  input: unknown,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = deleteWorkspaceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const membership = await requireMembership(parsed.data.workspaceId, userId);
  if (!canDeleteWorkspace(membership.role)) {
    return { ok: false, error: "Only the owner can delete this workspace." };
  }

  await prisma.workspace.delete({
    where: { id: parsed.data.workspaceId },
  });

  revalidatePath("/workspaces");
  revalidatePath("/dashboard");
  redirect("/workspaces");
}

export async function inviteMemberAction(
  input: unknown,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = inviteMemberSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const membership = await requireMembership(parsed.data.workspaceId, userId);
  if (!canInviteMembers(membership.role)) {
    return { ok: false, error: "You cannot invite members to this workspace." };
  }
  if (!canAssignRole(membership.role, parsed.data.role)) {
    return { ok: false, error: "You cannot assign that role." };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const invitee = await prisma.user.findUnique({ where: { email } });
  if (!invitee) {
    return {
      ok: false,
      error: "No account found for that email. They need to register first.",
    };
  }

  if (invitee.id === userId) {
    return { ok: false, error: "You are already a member." };
  }

  const existing = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: parsed.data.workspaceId,
        userId: invitee.id,
      },
    },
  });
  if (existing) {
    return { ok: false, error: "That user is already a member." };
  }

  await prisma.$transaction([
    prisma.workspaceMember.create({
      data: {
        workspaceId: parsed.data.workspaceId,
        userId: invitee.id,
        role: parsed.data.role,
      },
    }),
    prisma.activity.create({
      data: {
        workspaceId: parsed.data.workspaceId,
        actorId: userId,
        action: "INVITED",
        entityType: "member",
        entityId: invitee.id,
        metadata: {
          email: invitee.email,
          role: parsed.data.role,
        },
      },
    }),
  ]);

  const workspace = await prisma.workspace.findUnique({
    where: { id: parsed.data.workspaceId },
    select: { name: true },
  });

  await notifyUser({
    userId: invitee.id,
    type: "WORKSPACE_INVITED",
    title: "Workspace invitation",
    body: `You were added to “${workspace?.name ?? "a workspace"}” as ${parsed.data.role.toLowerCase()}.`,
    href: `/workspaces/${parsed.data.workspaceId}`,
    metadata: { workspaceId: parsed.data.workspaceId },
  });

  revalidatePath(`/workspaces/${parsed.data.workspaceId}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "Member invited." };
}

export async function updateMemberRoleAction(
  input: unknown,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = updateMemberRoleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const membership = await requireMembership(parsed.data.workspaceId, userId);
  const target = await prisma.workspaceMember.findFirst({
    where: {
      id: parsed.data.memberId,
      workspaceId: parsed.data.workspaceId,
    },
  });
  if (!target) {
    return { ok: false, error: "Member not found." };
  }
  if (target.userId === userId) {
    return { ok: false, error: "You cannot change your own role." };
  }
  if (!canModifyMember(membership.role, target.role)) {
    return { ok: false, error: "You cannot change this member's role." };
  }
  if (!canAssignRole(membership.role, parsed.data.role)) {
    return { ok: false, error: "You cannot assign that role." };
  }

  await prisma.$transaction([
    prisma.workspaceMember.update({
      where: { id: target.id },
      data: { role: parsed.data.role },
    }),
    prisma.activity.create({
      data: {
        workspaceId: parsed.data.workspaceId,
        actorId: userId,
        action: "UPDATED",
        entityType: "member",
        entityId: target.userId,
        metadata: { role: parsed.data.role },
      },
    }),
  ]);

  revalidatePath(`/workspaces/${parsed.data.workspaceId}`);
  return { ok: true, message: "Role updated." };
}

export async function removeMemberAction(
  input: unknown,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = removeMemberSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const membership = await requireMembership(parsed.data.workspaceId, userId);
  const target = await prisma.workspaceMember.findFirst({
    where: {
      id: parsed.data.memberId,
      workspaceId: parsed.data.workspaceId,
    },
  });
  if (!target) {
    return { ok: false, error: "Member not found." };
  }

  const isSelf = target.userId === userId;
  if (isSelf) {
    if (target.role === "OWNER") {
      const ownerCount = await prisma.workspaceMember.count({
        where: { workspaceId: parsed.data.workspaceId, role: "OWNER" },
      });
      if (ownerCount <= 1) {
        return {
          ok: false,
          error: "Transfer ownership before leaving as the only owner.",
        };
      }
    }
  } else if (!canModifyMember(membership.role, target.role)) {
    return { ok: false, error: "You cannot remove this member." };
  }

  await prisma.$transaction([
    prisma.workspaceMember.delete({ where: { id: target.id } }),
    prisma.activity.create({
      data: {
        workspaceId: parsed.data.workspaceId,
        actorId: userId,
        action: "DELETED",
        entityType: "member",
        entityId: target.userId,
        metadata: { self: isSelf },
      },
    }),
  ]);

  revalidatePath(`/workspaces/${parsed.data.workspaceId}`);
  revalidatePath("/workspaces");
  if (isSelf) {
    redirect("/workspaces");
  }
  return { ok: true, message: "Member removed." };
}
