import Link from "next/link";

import { branding } from "@/lib/branding";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  href?: string | null;
}

export function Logo({
  className,
  showWordmark = true,
  href = "/",
}: LogoProps) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className="relative flex size-8 items-center justify-center overflow-hidden rounded-lg bg-[linear-gradient(145deg,var(--brand-from),var(--brand-to))] shadow-sm"
      >
        <span className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_20%,white,transparent_55%)]" />
        <span className="relative h-3.5 w-3.5 rounded-[3px] border-2 border-white/90" />
      </span>
      {showWordmark ? (
        <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
          {branding.name}
        </span>
      ) : null}
    </span>
  );

  if (href === null) {
    return content;
  }

  return (
    <Link href={href} className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {content}
    </Link>
  );
}
