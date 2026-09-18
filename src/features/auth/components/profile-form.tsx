"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarPickerDialog } from "@/features/auth/components/avatar-picker-dialog";
import {
  removeAvatarAction,
  updateProfileAction,
  uploadAvatarAction,
} from "@/features/auth/profile-actions";
import { profileSchema } from "@/features/auth/schemas";

const formSchema = profileSchema.extend({
  emailEnabled: z.boolean(),
  assignedToCard: z.boolean(),
  mentioned: z.boolean(),
  dueDateReminder: z.boolean(),
  cardCommented: z.boolean(),
  boardInvited: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface ProfileFormProps {
  user: {
    name: string;
    email: string;
    bio: string;
    timezone: string;
    image?: string | null;
    notificationPrefs: {
      emailEnabled: boolean;
      assignedToCard: boolean;
      mentioned: boolean;
      dueDateReminder: boolean;
      cardCommented: boolean;
      boardInvited: boolean;
    };
  };
}

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
];

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [avatarPending, startAvatarTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimisticImage, setOptimisticImage] = useState<
    string | null | undefined
  >(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);
  const imageUrl =
    optimisticImage !== undefined ? optimisticImage : (user.image ?? null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user.name,
      bio: user.bio,
      timezone: user.timezone,
      ...user.notificationPrefs,
    },
  });

  async function syncSessionAndRefresh() {
    await updateSession();
    router.refresh();
  }

  function onSubmit(values: FormValues) {
    setError(null);
    startTransition(async () => {
      const result = await updateProfileAction(values);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      await syncSessionAndRefresh();
      toast.success(result.message ?? "Saved");
    });
  }

  function onAvatarSelected(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    const body = new FormData();
    body.set("file", file);

    startAvatarTransition(async () => {
      const result = await uploadAvatarAction(body);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setOptimisticImage(result.image ?? null);
      await syncSessionAndRefresh();
      toast.success(result.message ?? "Avatar updated");
    });
  }

  function onRemoveAvatar() {
    startAvatarTransition(async () => {
      const result = await removeAvatarAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setOptimisticImage(null);
      await syncSessionAndRefresh();
      toast.success(result.message ?? "Avatar removed");
    });
  }

  async function onGeneratedAvatarSelected(image: string) {
    setOptimisticImage(image);
    await syncSessionAndRefresh();
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
      noValidate
    >
      <div className="flex flex-wrap items-center gap-4">
        <Avatar className="size-16">
          {imageUrl ? <AvatarImage src={imageUrl} alt="" /> : null}
          <AvatarFallback>
            {(user.name || user.email).slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-2">
          <p className="text-sm font-medium">Avatar</p>
          <p className="text-xs text-muted-foreground">
            Upload a photo, or pick a free DiceBear avatar.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="sr-only"
              onChange={(event) => onAvatarSelected(event.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={avatarPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarPending ? "Uploading…" : "Upload photo"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={avatarPending}
              onClick={() => setPickerOpen(true)}
            >
              Choose avatar
            </Button>
            {imageUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={avatarPending}
                onClick={onRemoveAvatar}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <AvatarPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        userSeed={user.name || user.email}
        currentImage={imageUrl}
        onSelected={(image) => {
          void onGeneratedAvatarSelected(image);
        }}
      />
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...form.register("name")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={user.email} disabled />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <textarea
          id="bio"
          rows={3}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          {...form.register("bio")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <select
          id="timezone"
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          {...form.register("timezone")}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-3 rounded-xl border p-4">
        <legend className="px-1 text-sm font-medium">Notifications</legend>
        {(
          [
            ["emailEnabled", "Email notifications"],
            ["assignedToCard", "Assigned to a card"],
            ["mentioned", "Mentions"],
            ["dueDateReminder", "Due date reminders"],
            ["cardCommented", "Comments on your cards"],
            ["boardInvited", "Board invitations"],
          ] as const
        ).map(([key, label]) => (
          <label
            key={key}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <input
              type="checkbox"
              className="size-4 rounded border-input"
              {...form.register(key)}
            />
            {label}
          </label>
        ))}
      </fieldset>

      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
