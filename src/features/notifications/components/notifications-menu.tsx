"use client";

import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  loadNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/notifications/actions";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  isRead: boolean;
  createdAt: Date | string;
};

interface NotificationsMenuProps {
  initialUnreadCount: number;
  initialNotifications: NotificationItem[];
}

export function NotificationsMenu({
  initialUnreadCount,
  initialNotifications,
}: NotificationsMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [override, setOverride] = useState<{
    unreadCount: number;
    notifications: NotificationItem[];
  } | null>(null);

  const unreadCount = override?.unreadCount ?? initialUnreadCount;
  const notifications = override?.notifications ?? initialNotifications;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    startTransition(async () => {
      const result = await loadNotificationsAction();
      if (!result.ok) return;
      setOverride({
        unreadCount: result.unreadCount,
        notifications: result.notifications,
      });
    });
  }

  function markOne(notification: NotificationItem) {
    startTransition(async () => {
      if (!notification.isRead) {
        const result = await markNotificationReadAction({
          notificationId: notification.id,
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setOverride({
          unreadCount: Math.max(0, unreadCount - 1),
          notifications: notifications.map((item) =>
            item.id === notification.id ? { ...item, isRead: true } : item,
          ),
        });
      }
      if (notification.href) {
        setOpen(false);
        router.push(notification.href);
      }
    });
  }

  function markAll() {
    startTransition(async () => {
      const result = await markAllNotificationsReadAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOverride({
        unreadCount: 0,
        notifications: notifications.map((item) => ({
          ...item,
          isRead: true,
        })),
      });
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "relative",
        )}
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-brand-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between gap-2 px-3 py-2.5 font-normal">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="text-xs text-brand hover:underline disabled:opacity-50"
                disabled={pending}
                onClick={markAll}
              >
                Mark all read
              </button>
            ) : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="m-0" />
        {notifications.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            You&apos;re all caught up.
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto py-1">
            {notifications.map((item) => (
              <li key={item.id}>
                <DropdownMenuItem
                  className={cn(
                    "cursor-pointer items-start gap-2 rounded-none px-3 py-2.5",
                    !item.isRead && "bg-brand/5",
                  )}
                  onClick={() => markOne(item)}
                >
                  <span
                    className={cn(
                      "mt-1.5 size-1.5 shrink-0 rounded-full",
                      item.isRead ? "bg-transparent" : "bg-brand",
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 space-y-0.5">
                    <span className="block text-sm font-medium">{item.title}</span>
                    {item.body ? (
                      <span className="block text-xs text-muted-foreground">
                        {item.body}
                      </span>
                    ) : null}
                    <span className="block text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </span>
                </DropdownMenuItem>
              </li>
            ))}
          </ul>
        )}
        <DropdownMenuSeparator className="m-0" />
        <div className="px-3 py-2">
          <Link
            href="/my-work"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            View assigned work →
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
