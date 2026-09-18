import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/features/boards/queries";

export async function listNotifications(userId: string, limit = 20) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function countUnreadNotifications(userId: string) {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

export async function getNotificationBadge(userId: string) {
  const [unreadCount, latest] = await Promise.all([
    countUnreadNotifications(userId),
    listNotifications(userId, 15),
  ]);
  return { unreadCount, notifications: latest };
}

export { requireUserId };
