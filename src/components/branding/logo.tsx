import Image from "next/image";
import Link from "next/link";

import { branding } from "@/lib/branding";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Extra text beside the mark. Default off — the PNG already includes the wordmark. */
  showWordmark?: boolean;
  href?: string | null;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASS = {
  sm: "h-auto w-full max-h-[4.5rem]",
  md: "h-14 w-auto max-w-[15rem]",
  lg: "h-auto w-full max-w-md max-h-40",
} as const;

const SIZE_PX = {
  sm: { width: 428, height: 285 },
  md: { width: 240, height: 160 },
  lg: { width: 428, height: 285 },
} as const;

export function Logo({
  className,
  showWordmark = false,
  href = "/",
  size = "md",
}: LogoProps) {
  const dims = SIZE_PX[size];

  const content = (
    <span
      className={cn(
        "inline-flex w-full items-center justify-start",
        className,
      )}
    >
      <Image
        src={branding.logoSrc}
        alt={branding.name}
        width={dims.width}
        height={dims.height}
        className={cn(
          SIZE_CLASS[size],
          "bg-transparent object-contain object-left",
        )}
        priority
      />
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
    <Link
      href={href}
      className="block w-full rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {content}
    </Link>
  );
}
