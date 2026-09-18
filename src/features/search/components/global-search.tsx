"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  LayoutGrid,
  Loader2,
  Search,
  SquareKanban,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useId, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { searchAction } from "@/features/search/actions";
import { cn } from "@/lib/utils";

const KIND_ICON = {
  card: SquareKanban,
  board: LayoutGrid,
  workspace: Building2,
} as const;

export function GlobalSearch() {
  const router = useRouter();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const trimmed = deferredQuery.trim();
  const canSearch = open && trimmed.length >= 2;

  const { data: results = [], isFetching, error } = useQuery({
    queryKey: ["global-search", trimmed],
    queryFn: async () => {
      const result = await searchAction(trimmed);
      if (!result.ok) throw new Error(result.error);
      return result.results;
    },
    enabled: canSearch,
    staleTime: 15_000,
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "sm:hidden",
        )}
        aria-label="Search"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
      </button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <DialogTrigger
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "hidden w-44 justify-start gap-2 text-muted-foreground sm:inline-flex md:w-56",
          )}
        >
          <Search className="size-3.5" />
          <span className="flex-1 truncate text-left">Search…</span>
          <kbd className="rounded border bg-muted px-1 text-[10px] font-medium">
            ⌘K
          </kbd>
        </DialogTrigger>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Search</DialogTitle>
          <DialogDescription>
            Find cards, boards, and workspaces
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 text-muted-foreground" />
          <Input
            id={inputId}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cards, boards, workspaces…"
            className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
          {isFetching ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : null}
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {error ? (
            <p className="px-2 py-6 text-center text-sm text-destructive">
              {error instanceof Error ? error.message : "Search failed"}
            </p>
          ) : null}
          {!error && trimmed.length < 2 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search.
            </p>
          ) : null}
          {!error && canSearch && !isFetching && results.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No matches for “{trimmed}”.
            </p>
          ) : null}
          <ul className="space-y-0.5">
            {canSearch
              ? results.map((hit) => {
                  const Icon = KIND_ICON[hit.kind];
                  return (
                    <li key={`${hit.kind}-${hit.id}`}>
                      <button
                        type="button"
                        className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-muted"
                        onClick={() => go(hit.href)}
                      >
                        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {hit.title}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {hit.kind} · {hit.subtitle}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })
              : null}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
