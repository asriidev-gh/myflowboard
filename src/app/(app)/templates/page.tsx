import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TemplatesGallery } from "@/features/templates/components/templates-gallery";
import { listWorkspacesForUser } from "@/features/workspaces/queries";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "Templates" };

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const workspaces = await listWorkspacesForUser(session.user.id);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Templates
        </h1>
        <p className="text-sm text-muted-foreground">
          Start a board with lists and labels already set up for common
          workflows.
        </p>
      </div>
      <TemplatesGallery
        workspaces={workspaces.map((workspace) => ({
          id: workspace.id,
          name: workspace.name,
        }))}
      />
    </div>
  );
}
