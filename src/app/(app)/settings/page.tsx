import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your account and preferences.
        </p>
      </div>
      <Link
        href="/settings/profile"
        className="block rounded-xl border bg-card p-4 transition-colors hover:bg-accent/40"
      >
        <p className="font-medium">Profile</p>
        <p className="text-sm text-muted-foreground">
          Avatar, name, bio, timezone, and notifications
        </p>
      </Link>
    </div>
  );
}
