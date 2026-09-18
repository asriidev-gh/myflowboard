import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MyWorkList } from "@/features/my-work/components/my-work-list";
import { listAssignedCards } from "@/features/my-work/queries";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "My Work" };

export default async function MyWorkPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const cards = await listAssignedCards(session.user.id);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          My Work
        </h1>
        <p className="text-sm text-muted-foreground">
          Cards assigned to you, grouped by due date.
        </p>
      </div>
      <MyWorkList cards={cards} />
    </div>
  );
}
