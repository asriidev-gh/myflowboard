import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { branding } from "@/lib/branding";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FileQuestion className="size-5" aria-hidden />
      </div>
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="text-sm text-muted-foreground">
          That page doesn&apos;t exist in {branding.name}, or you may not have
          access to it.
        </p>
      </div>
      <Link href="/dashboard" className={cn(buttonVariants())}>
        Back to dashboard
      </Link>
    </div>
  );
}
