"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  loginAction,
  type ActionResult,
} from "@/features/auth/actions";

export function LoginForm({
  callbackUrl = "/dashboard",
}: {
  callbackUrl?: string;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(loginAction, null);

  return (
    <form
      action={formAction}
      data-testid="login-form"
      data-ready="true"
      className="flex flex-col gap-4"
      noValidate
    >
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-brand hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          name="remember"
          defaultChecked
          className="size-4 rounded border-input"
        />
        Remember this session
      </label>

      {state && !state.ok ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
