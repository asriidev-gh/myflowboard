"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AVATAR_PICKER_SEEDS,
  buildDicebearAvatarUrl,
  DICEBEAR_STYLES,
  type DicebearStyleId,
} from "@/features/auth/avatar-presets";
import { setGeneratedAvatarAction } from "@/features/auth/profile-actions";
import { cn } from "@/lib/utils";

interface AvatarPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userSeed: string;
  currentImage?: string | null;
  onSelected: (imageUrl: string) => void;
}

export function AvatarPickerDialog({
  open,
  onOpenChange,
  userSeed,
  currentImage,
  onSelected,
}: AvatarPickerDialogProps) {
  const [style, setStyle] = useState<DicebearStyleId>("fun-emoji");
  const [pending, startTransition] = useTransition();
  const [broken, setBroken] = useState<Record<string, true>>({});

  const seeds = useMemo(() => {
    const normalized =
      userSeed
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "flowboard";
    const unique = new Set<string>([normalized, ...AVATAR_PICKER_SEEDS]);
    return Array.from(unique).slice(0, 18);
  }, [userSeed]);

  function selectAvatar(seed: string) {
    startTransition(async () => {
      const result = await setGeneratedAvatarAction({ style, seed });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.image) {
        onSelected(result.image);
      }
      onOpenChange(false);
      toast.success(result.message ?? "Avatar updated");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Choose an avatar</DialogTitle>
          <DialogDescription>
            Colorful DiceBear styles — no photo upload needed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {DICEBEAR_STYLES.map((entry) => (
            <Button
              key={entry.id}
              type="button"
              size="sm"
              variant={style === entry.id ? "default" : "outline"}
              disabled={pending}
              onClick={() => {
                setStyle(entry.id);
                setBroken({});
              }}
            >
              {entry.label}
            </Button>
          ))}
        </div>

        <div className="grid max-h-72 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
          {seeds.map((seed) => {
            const url = buildDicebearAvatarUrl(style, seed);
            const selected = currentImage === url;
            const failed = Boolean(broken[url]);
            return (
              <button
                key={`${style}-${seed}`}
                type="button"
                disabled={pending || failed}
                onClick={() => selectAvatar(seed)}
                className={cn(
                  "flex size-14 items-center justify-center rounded-full p-0.5 ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "ring-2 ring-primary"
                    : "hover:ring-2 hover:ring-muted-foreground/40",
                  (pending || failed) && "opacity-60",
                )}
                aria-label={`Use ${style} avatar ${seed}`}
              >
                {failed ? (
                  <span className="size-12 rounded-full bg-muted" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- DiceBear CDN SVGs
                  <img
                    src={url}
                    alt=""
                    width={56}
                    height={56}
                    loading="lazy"
                    decoding="async"
                    onError={() =>
                      setBroken((prev) => ({ ...prev, [url]: true }))
                    }
                    className="size-12 rounded-full bg-muted object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Avatars by{" "}
          <a
            href="https://www.dicebear.com"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            DiceBear
          </a>
          . Try Emoji, Robots, or Pixel for the brightest looks.
        </p>
      </DialogContent>
    </Dialog>
  );
}
