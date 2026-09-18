import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { ProfileForm } from "@/features/auth/components/profile-form";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfileSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { notificationPrefs: true },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Profile
        </h1>
        <p className="text-sm text-muted-foreground">
          Update how you appear across {process.env.NEXT_PUBLIC_APP_NAME ?? "My-FlowBoard"}.
        </p>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Account details</CardTitle>
          <CardDescription>
            Email is used for sign-in and cannot be changed here yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            user={{
              name: user.name ?? "",
              email: user.email,
              bio: user.bio ?? "",
              timezone: user.timezone,
              image: user.image,
              notificationPrefs: {
                emailEnabled: user.notificationPrefs?.emailEnabled ?? true,
                assignedToCard:
                  user.notificationPrefs?.assignedToCard ?? true,
                mentioned: user.notificationPrefs?.mentioned ?? true,
                dueDateReminder:
                  user.notificationPrefs?.dueDateReminder ?? true,
                cardCommented: user.notificationPrefs?.cardCommented ?? true,
                boardInvited: user.notificationPrefs?.boardInvited ?? true,
              },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
