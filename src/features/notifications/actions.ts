"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUserId } from "@/features/boards/queries";
import { prisma } from "@/lib/db/prisma";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

async function authUser(): Promise<ActionResult | { userId: string }> {
  try {
    return { userId: await requireUserId() };
  } catch {
    return { ok: false, error: "You must be signed in." };
  }
}

export async function markNotificationReadAction(
  input: unknown,
): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  const parsed = z.object({ notificationId: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid notification." };

  const updated = await prisma.notification.updateMany({
    where: { id: parsed.data.notificationId, userId: auth.userId },
    data: { isRead: true },
  });
  if (updated.count === 0) {
    return { ok: false, error: "Notification not found." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const auth = await authUser();
  if ("ok" in auth) return auth;

  await prisma.notification.updateMany({
    where: { userId: auth.userId, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function loadNotificationsAction(): Promise<
  | {
      ok: true;
      unreadCount: number;
      notifications: {
        id: string;
        type: string;
        title: string;
        body: string | null;
        href: string | null;
        isRead: boolean;
        createdAt: Date;
      }[];
    }
  | { ok: false; error: string }
> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: "You must be signed in." };
  }

  const [unreadCount, notifications] = await Promise.all([
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        href: true,
        isRead: true,
        createdAt: true,
      },
    }),
  ]);

  return { ok: true, unreadCount, notifications };
}
