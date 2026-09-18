"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/lib/auth";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
} from "@/features/auth/schemas";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

/** Only allow same-origin relative paths (open-redirect safe). */
function safeCallbackUrl(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  return value;
}

export async function registerAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.user.create({
    data: {
      name: parsed.data.name.trim(),
      email,
      passwordHash,
      notificationPrefs: {
        create: {},
      },
    },
  });

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        ok: false,
        error: "Account created, but sign-in failed. Please log in.",
      };
    }
    throw error;
  }

  redirect("/dashboard");
}

/**
 * Form-action login (works even if client JS/hydration fails).
 * On success, redirects server-side so the session cookie is applied
 * in the same response — avoids the dashboard → login bounce loop.
 */
export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    remember: formData.get("remember") === "on",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase().trim(),
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Invalid email or password." };
    }
    throw error;
  }

  redirect(safeCallbackUrl(formData.get("callbackUrl")));
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

export async function forgotPasswordAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Always return success to avoid email enumeration.
  // Token email delivery will be wired in a later phase.
  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 1000 * 60 * 60);

    await prisma.passwordResetToken.deleteMany({ where: { email } });
    await prisma.passwordResetToken.create({
      data: { email, token, expires },
    });

    if (process.env.NODE_ENV === "development") {
      console.info(
        `[dev] Password reset for ${email}: /reset-password?token=${token}`,
      );
    }
  }

  return {
    ok: true,
    message: "If that email exists, reset instructions were sent.",
  };
}
