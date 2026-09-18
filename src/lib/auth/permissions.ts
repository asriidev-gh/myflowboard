import type { WorkspaceRole } from "@prisma/client";

/**
 * Server-side permission helpers.
 * Always enforce these on the server — never trust the client alone.
 */

const WORKSPACE_ROLE_RANK: Record<WorkspaceRole, number> = {
  GUEST: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
};

export function hasWorkspaceRole(
  role: WorkspaceRole,
  minimum: WorkspaceRole,
): boolean {
  return WORKSPACE_ROLE_RANK[role] >= WORKSPACE_ROLE_RANK[minimum];
}

export function canManageWorkspace(role: WorkspaceRole): boolean {
  return hasWorkspaceRole(role, "ADMIN");
}

export function canDeleteWorkspace(role: WorkspaceRole): boolean {
  return role === "OWNER";
}

export function canInviteMembers(role: WorkspaceRole): boolean {
  return hasWorkspaceRole(role, "ADMIN");
}

export function canRemoveMembers(role: WorkspaceRole): boolean {
  return hasWorkspaceRole(role, "ADMIN");
}

export function canChangeMemberRoles(role: WorkspaceRole): boolean {
  return hasWorkspaceRole(role, "ADMIN");
}

export function canEditBoardContent(role: WorkspaceRole): boolean {
  return hasWorkspaceRole(role, "MEMBER");
}

export function canViewWorkspace(role: WorkspaceRole): boolean {
  return hasWorkspaceRole(role, "GUEST");
}

/** Admins cannot assign/remove OWNER; only OWNER can manage OWNER seats. */
export function canAssignRole(
  actorRole: WorkspaceRole,
  targetRole: WorkspaceRole,
): boolean {
  if (targetRole === "OWNER") {
    return actorRole === "OWNER";
  }
  return canChangeMemberRoles(actorRole);
}

export function canModifyMember(
  actorRole: WorkspaceRole,
  targetRole: WorkspaceRole,
): boolean {
  if (targetRole === "OWNER") {
    return actorRole === "OWNER";
  }
  if (WORKSPACE_ROLE_RANK[actorRole] <= WORKSPACE_ROLE_RANK[targetRole]) {
    // Admins cannot modify other admins; owners can
    return actorRole === "OWNER";
  }
  return canRemoveMembers(actorRole);
}
