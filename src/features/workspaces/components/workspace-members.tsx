"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  inviteMemberAction,
  removeMemberAction,
  updateMemberRoleAction,
} from "@/features/workspaces/actions";
import {
  inviteMemberSchema,
  type InviteMemberInput,
} from "@/features/workspaces/schemas";
import {
  canChangeMemberRoles,
  canInviteMembers,
  canModifyMember,
} from "@/lib/auth/permissions";
import type { WorkspaceRole } from "@prisma/client";

interface MemberRow {
  id: string;
  role: WorkspaceRole;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface WorkspaceMembersProps {
  workspaceId: string;
  currentUserId: string;
  currentRole: WorkspaceRole;
  members: MemberRow[];
}

function initials(name: string | null, email: string) {
  if (name?.trim()) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
  }
  return email[0]?.toUpperCase() ?? "?";
}

export function WorkspaceMembers({
  workspaceId,
  currentUserId,
  currentRole,
  members,
}: WorkspaceMembersProps) {
  const canInvite = canInviteMembers(currentRole);
  const canChangeRoles = canChangeMemberRoles(currentRole);

  return (
    <div className="space-y-6">
      {canInvite ? <InviteMemberForm workspaceId={workspaceId} /> : null}

      <ul className="divide-y rounded-xl border">
        {members.map((member) => {
          const isSelf = member.userId === currentUserId;
          const canEdit =
            !isSelf && canModifyMember(currentRole, member.role);
          const canLeave = isSelf && member.role !== "OWNER";

          return (
            <li
              key={member.id}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="size-9">
                  {member.user.image ? (
                    <AvatarImage src={member.user.image} alt="" />
                  ) : null}
                  <AvatarFallback>
                    {initials(member.user.name, member.user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {member.user.name ?? member.user.email}
                    {isSelf ? (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (you)
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.user.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canEdit && canChangeRoles && member.role !== "OWNER" ? (
                  <RoleSelect
                    workspaceId={workspaceId}
                    memberId={member.id}
                    role={member.role}
                  />
                ) : (
                  <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium capitalize">
                    {member.role.toLowerCase()}
                  </span>
                )}

                {(canEdit || canLeave) && member.role !== "OWNER" ? (
                  <RemoveMemberButton
                    workspaceId={workspaceId}
                    memberId={member.id}
                    label={isSelf ? "Leave" : "Remove"}
                  />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function InviteMemberForm({ workspaceId }: { workspaceId: string }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      workspaceId,
      email: "",
      role: "MEMBER",
    },
  });

  function onSubmit(values: InviteMemberInput) {
    startTransition(async () => {
      const result = await inviteMemberAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Invited");
      form.reset({ workspaceId, email: "", role: "MEMBER" });
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-end"
      noValidate
    >
      <input type="hidden" {...form.register("workspaceId")} />
      <div className="flex-1 space-y-2">
        <Label htmlFor="invite-email">Invite by email</Label>
        <Input
          id="invite-email"
          type="email"
          placeholder="teammate@company.com"
          {...form.register("email")}
        />
      </div>
      <div className="space-y-2 sm:w-36">
        <Label htmlFor="invite-role">Role</Label>
        <select
          id="invite-role"
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          {...form.register("role")}
        >
          <option value="ADMIN">Admin</option>
          <option value="MEMBER">Member</option>
          <option value="GUEST">Guest</option>
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Inviting…" : "Invite"}
      </Button>
    </form>
  );
}

function RoleSelect({
  workspaceId,
  memberId,
  role,
}: {
  workspaceId: string;
  memberId: string;
  role: WorkspaceRole;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs capitalize disabled:opacity-50"
      value={role}
      disabled={pending}
      onChange={(event) => {
        const nextRole = event.target.value as "ADMIN" | "MEMBER" | "GUEST";
        startTransition(async () => {
          const result = await updateMemberRoleAction({
            workspaceId,
            memberId,
            role: nextRole,
          });
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Role updated");
        });
      }}
    >
      <option value="ADMIN">Admin</option>
      <option value="MEMBER">Member</option>
      <option value="GUEST">Guest</option>
    </select>
  );
}

function RemoveMemberButton({
  workspaceId,
  memberId,
  label,
}: {
  workspaceId: string;
  memberId: string;
  label: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await removeMemberAction({ workspaceId, memberId });
          if (result && !result.ok) {
            toast.error(result.error);
          }
        });
      }}
    >
      {pending ? "…" : label}
    </Button>
  );
}
