import { describe, expect, it } from "vitest";

import {
  canAssignRole,
  canChangeMemberRoles,
  canDeleteWorkspace,
  canEditBoardContent,
  canInviteMembers,
  canManageWorkspace,
  canModifyMember,
  canRemoveMembers,
  canViewWorkspace,
  hasWorkspaceRole,
} from "@/lib/auth/permissions";

describe("workspace permissions", () => {
  it("ranks roles correctly", () => {
    expect(hasWorkspaceRole("MEMBER", "GUEST")).toBe(true);
    expect(hasWorkspaceRole("GUEST", "MEMBER")).toBe(false);
    expect(hasWorkspaceRole("OWNER", "ADMIN")).toBe(true);
  });

  it("gates management actions", () => {
    expect(canManageWorkspace("ADMIN")).toBe(true);
    expect(canManageWorkspace("MEMBER")).toBe(false);
    expect(canDeleteWorkspace("OWNER")).toBe(true);
    expect(canDeleteWorkspace("ADMIN")).toBe(false);
    expect(canInviteMembers("ADMIN")).toBe(true);
    expect(canInviteMembers("GUEST")).toBe(false);
    expect(canRemoveMembers("ADMIN")).toBe(true);
    expect(canChangeMemberRoles("OWNER")).toBe(true);
  });

  it("restricts owner and peer modifications", () => {
    expect(canAssignRole("ADMIN", "OWNER")).toBe(false);
    expect(canAssignRole("OWNER", "OWNER")).toBe(true);
    expect(canAssignRole("ADMIN", "MEMBER")).toBe(true);
    expect(canModifyMember("ADMIN", "OWNER")).toBe(false);
    expect(canModifyMember("ADMIN", "ADMIN")).toBe(false);
    expect(canModifyMember("OWNER", "ADMIN")).toBe(true);
    expect(canModifyMember("ADMIN", "MEMBER")).toBe(true);
  });

  it("allows guests to view", () => {
    expect(canViewWorkspace("GUEST")).toBe(true);
  });

  it("gates board content edits to members+", () => {
    expect(canEditBoardContent("GUEST")).toBe(false);
    expect(canEditBoardContent("MEMBER")).toBe(true);
    expect(canEditBoardContent("ADMIN")).toBe(true);
  });
});
