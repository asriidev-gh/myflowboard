import type { NotificationType, Prisma } from "@prisma/client";

import { shouldSendNotification } from "@/features/notifications/prefs";
import { prisma } from "@/lib/db/prisma";

export async function notifyUser(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId: input.userId },
    select: {
      assignedToCard: true,
      mentioned: true,
      dueDateReminder: true,
      cardCommented: true,
      boardInvited: true,
    },
  });

  if (!shouldSendNotification(prefs, input.type)) {
    return null;
  }

  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
      metadata: input.metadata,
    },
  });
}
