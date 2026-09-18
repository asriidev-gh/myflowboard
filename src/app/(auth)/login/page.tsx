import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/features/auth/components/login-form";
import { branding } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Sign in",
};

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl =
    params.callbackUrl &&
    params.callbackUrl.startsWith("/") &&
    !params.callbackUrl.startsWith("//")
      ? params.callbackUrl
      : "/dashboard";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to {branding.name} to continue.
        </p>
      </div>
      {params.error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Sign-in failed. Check your email and password, then try again.
        </p>
      ) : null}
      <LoginForm callbackUrl={callbackUrl} />
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-brand hover:underline"
        >
          Create one
        </Link>
      </p>
      <p className="text-center text-xs text-muted-foreground">
        Demo: john@acme.dev / password123
      </p>
    </div>
  );
}
