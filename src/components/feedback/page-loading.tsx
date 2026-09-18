import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageLoading({
  className,
  cards = 3,
}: {
  className?: string;
  cards?: number;
}) {
  return (
    <div
      className={cn("mx-auto flex w-full max-w-5xl flex-col gap-6", className)}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, index) => (
          <div key={index} className="space-y-3 rounded-xl border p-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function BoardPageLoading() {
  return (
    <div
      className="-m-4 flex min-h-[calc(100vh-3.5rem)] flex-col md:-m-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 border-b px-4 py-3 md:px-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-40" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
      <div className="flex gap-3 overflow-hidden p-4 md:p-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flex w-72 shrink-0 flex-col gap-2 rounded-xl bg-muted/40 p-3"
          >
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading board</span>
    </div>
  );
}
