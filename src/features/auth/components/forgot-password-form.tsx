"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction } from "@/features/auth/actions";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/features/auth/schemas";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: ForgotPasswordInput) {
    setMessage(null);
    startTransition(async () => {
      const result = await forgotPasswordAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setMessage(result.message ?? "Check your email for reset instructions.");
      toast.success("Request received");
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          aria-invalid={!!form.formState.errors.email}
          {...form.register("email")}
        />
        {form.formState.errors.email ? (
          <p className="text-xs text-destructive">
            {form.formState.errors.email.message}
          </p>
        ) : null}
      </div>

      {message ? (
        <p className="rounded-md bg-brand/10 px-3 py-2 text-sm text-foreground">
          {message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
