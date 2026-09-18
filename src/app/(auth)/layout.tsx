import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/branding/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { auth } from "@/lib/auth";
import { branding } from "@/lib/branding";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-svh flex-col bg-[radial-gradient(1200px_600px_at_10%_-10%,color-mix(in_oklch,var(--brand)_18%,transparent),transparent),radial-gradient(900px_500px_at_90%_0%,color-mix(in_oklch,var(--brand-to)_16%,transparent),transparent)]">
      <div className="flex items-center justify-end px-4 py-4 md:px-8">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-10 px-4 pb-16 md:flex-row md:items-center md:gap-16">
        <section className="hidden w-full max-w-md flex-1 flex-col justify-center md:flex">
          <Logo size="lg" href={null} className="self-start" />
          <p className="mt-5 text-left text-lg text-muted-foreground">
            {branding.shortDescription}.
          </p>
          <ul className="mt-8 space-y-3 text-left text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand" />
              Workspaces, boards, and cards built for clarity
            </li>
            <li className="flex gap-2">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand" />
              Fast drag-and-drop with durable ordering
            </li>
            <li className="flex gap-2">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand" />
              Collaboration with roles, activity, and notifications
            </li>
          </ul>
        </section>

        <section className="w-full max-w-md rounded-2xl border bg-card/90 p-6 shadow-sm backdrop-blur-sm md:p-8">
          {children}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to use {branding.name} for your team&apos;s
            work.{" "}
            <Link href="/login" className="underline-offset-2 hover:underline">
              Need help?
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
