import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, LayoutGrid, Users } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateWorkspaceDialog } from "@/features/workspaces/components/create-workspace-dialog";
import { listWorkspacesForUser } from "@/features/workspaces/queries";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Workspaces" };

export default async function WorkspacesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspaces = await listWorkspacesForUser(session.user.id);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Workspaces
          </h1>
          <p className="text-sm text-muted-foreground">
            Organize boards and teammates by team or project.
          </p>
        </div>
        <CreateWorkspaceDialog />
      </div>

      {workspaces.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No workspaces yet"
          description="Create your first workspace to start adding boards and inviting members."
          action={<CreateWorkspaceDialog />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {workspaces.map((workspace) => {
            const role = workspace.members[0]?.role ?? "MEMBER";
            return (
              <Card key={workspace.id} className="shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    <Link
                      href={`/workspaces/${workspace.id}`}
                      className="hover:text-brand hover:underline"
                    >
                      {workspace.name}
                    </Link>
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {workspace.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" />
                      {workspace._count.members}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <LayoutGrid className="size-3.5" />
                      {workspace._count.boards}
                    </span>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 capitalize">
                      {role.toLowerCase()}
                    </span>
                  </div>
                  <Link
                    href={`/workspaces/${workspace.id}`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                    )}
                  >
                    Open
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
