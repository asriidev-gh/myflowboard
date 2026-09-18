"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { profileSchema } from "@/features/auth/schemas";

export type ProfileActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

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

  revalidatePath("/settings/profile");
  return { ok: true, message: "Profile updated." };
}
