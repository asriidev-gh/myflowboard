import { redirect } from "next/navigation";

import { SkipLink } from "@/components/a11y/skip-link";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getNotificationBadge } from "@/features/notifications/queries";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [badge, dbUser] = await Promise.all([
    getNotificationBadge(session.user.id),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, image: true },
    }),
  ]);

  if (!dbUser) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh w-full bg-background">
      <SkipLink />
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          user={dbUser}
          notifications={{
            unreadCount: badge.unreadCount,
            items: badge.notifications,
          }}
        />
        <main id="main-content" className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
