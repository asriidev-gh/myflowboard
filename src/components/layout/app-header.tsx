"use client";

import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";

import { MobileNav } from "@/components/layout/app-sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { logoutAction } from "@/features/auth/actions";
import { NotificationsMenu } from "@/features/notifications/components/notifications-menu";
import { GlobalSearch } from "@/features/search/components/global-search";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  notifications: {
    unreadCount: number;
    items: {
      id: string;
      type: string;
      title: string;
      body: string | null;
      href: string | null;
      isRead: boolean;
      createdAt: Date;
    }[];
  };
}

function initials(name?: string | null, email?: string | null) {
  if (name?.trim()) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }
  return (email?.[0] ?? "U").toUpperCase();
}

export function AppHeader({ user, notifications }: AppHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background/80 px-3 backdrop-blur-md md:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <MobileNav />
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-1.5">
        <NotificationsMenu
          initialUnreadCount={notifications.unreadCount}
          initialNotifications={notifications.items}
        />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "rounded-full",
            )}
            aria-label="Account menu"
          >
            <Avatar className="size-8">
              {user.image ? <AvatarImage src={user.image} alt="" /> : null}
              <AvatarFallback className="text-xs">
                {initials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">
                    {user.name ?? "Account"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="cursor-pointer p-0">
                <Link
                  href="/settings/profile"
                  className="flex w-full items-center gap-1.5 px-1.5 py-1"
                >
                  <UserRound className="size-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  void logoutAction();
                }}
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
