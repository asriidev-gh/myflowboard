"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { profileSchema } from "@/features/auth/schemas";
import {
  buildDicebearAvatarUrl,
  isDicebearStyleId,
} from "@/features/auth/avatar-presets";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getStorageProvider } from "@/lib/storage";
import { MAX_UPLOAD_BYTES } from "@/lib/storage/types";

const AVATAR_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export type ProfileActionResult =
  | { ok: true; message?: string; name?: string; image?: string | null }
  | { ok: false; error: string };

function revalidateProfilePaths() {
  revalidatePath("/settings/profile");
  revalidatePath("/", "layout");
}

const updateProfileSchema = profileSchema.extend({
  emailEnabled: z.boolean().optional(),
  assignedToCard: z.boolean().optional(),
  mentioned: z.boolean().optional(),
  dueDateReminder: z.boolean().optional(),
  cardCommented: z.boolean().optional(),
  boardInvited: z.boolean().optional(),
});

export async function updateProfileAction(
  input: unknown,
): Promise<ProfileActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "You must be signed in." };
  }

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const {
    name,
    bio,
    timezone,
    emailEnabled = true,
    assignedToCard = true,
    mentioned = true,
    dueDateReminder = true,
    cardCommented = true,
    boardInvited = true,
  } = parsed.data;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name.trim(),
      bio: bio?.trim() || null,
      timezone,
      notificationPrefs: {
        upsert: {
          create: {
            emailEnabled,
            assignedToCard,
            mentioned,
            dueDateReminder,
            cardCommented,
            boardInvited,
          },
          update: {
            emailEnabled,
            assignedToCard,
            mentioned,
            dueDateReminder,
            cardCommented,
            boardInvited,
          },
        },
      },
    },
  });

  revalidateProfilePaths();
  return {
    ok: true,
    message: "Profile updated.",
    name: name.trim(),
  };
}

function localKeyFromImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  const marker = "/api/files/";
  const index = imageUrl.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(imageUrl.slice(index + marker.length));
}

export async function uploadAvatarAction(
  formData: FormData,
): Promise<ProfileActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "You must be signed in." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an image to upload." };
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return { ok: false, error: "Avatar must be 2 MB or smaller." };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "File exceeds the upload size limit." };
  }

  const mimeType = file.type || "application/octet-stream";
  if (!AVATAR_MIME_TYPES.has(mimeType)) {
    return {
      ok: false,
      error: "Use a JPEG, PNG, GIF, or WebP image.",
    };
  }

  const storage = getStorageProvider();
  const existing = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true },
  });

  try {
    const stored = await storage.upload({
      buffer: Buffer.from(await file.arrayBuffer()),
      fileName: file.name,
      mimeType,
      size: file.size,
      prefix: `avatars/${session.user.id}`,
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: stored.url },
    });

    const oldKey = localKeyFromImageUrl(existing?.image);
    if (oldKey) {
      try {
        await storage.delete(oldKey);
      } catch {
        // Best-effort cleanup of the previous local avatar.
      }
    }

    revalidateProfilePaths();
    return {
      ok: true,
      message: "Avatar updated.",
      image: stored.url,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Upload failed.",
    };
  }
}

export async function removeAvatarAction(): Promise<ProfileActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "You must be signed in." };
  }

  const existing = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: null },
  });

  const oldKey = localKeyFromImageUrl(existing?.image);
  if (oldKey) {
    try {
      await getStorageProvider().delete(oldKey);
    } catch {
      // Best-effort cleanup.
    }
  }

  revalidateProfilePaths();
  return { ok: true, message: "Avatar removed.", image: null };
}

const generatedAvatarSchema = z.object({
  style: z.string().min(1),
  seed: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid avatar seed."),
});

export async function setGeneratedAvatarAction(
  input: unknown,
): Promise<ProfileActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "You must be signed in." };
  }

  const parsed = generatedAvatarSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid avatar selection.",
    };
  }

  if (!isDicebearStyleId(parsed.data.style)) {
    return { ok: false, error: "That avatar style is not available." };
  }

  const imageUrl = buildDicebearAvatarUrl(
    parsed.data.style,
    parsed.data.seed,
    128,
  );

  const existing = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: imageUrl },
  });

  const oldKey = localKeyFromImageUrl(existing?.image);
  if (oldKey) {
    try {
      await getStorageProvider().delete(oldKey);
    } catch {
      // Best-effort cleanup of a previous uploaded avatar.
    }
  }

  revalidateProfilePaths();
  return {
    ok: true,
    message: "Avatar updated.",
    image: imageUrl,
  };
}
