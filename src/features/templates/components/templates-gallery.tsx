"use client";

import { useMemo, useState } from "react";
import { Columns3, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  BOARD_TEMPLATES,
  listBoardTemplateCategories,
  type BoardTemplate,
} from "@/features/templates/catalog";
import {
  UseTemplateDialog,
  type TemplateWorkspaceOption,
} from "@/features/templates/components/use-template-dialog";
import { cn } from "@/lib/utils";

interface TemplatesGalleryProps {
  workspaces: TemplateWorkspaceOption[];
}

export function TemplatesGallery({ workspaces }: TemplatesGalleryProps) {
  const categories = useMemo(() => ["All", ...listBoardTemplateCategories()], []);
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<BoardTemplate | null>(null);

  const templates =
    category === "All"
      ? BOARD_TEMPLATES
      : BOARD_TEMPLATES.filter((template) => template.category === category);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              category === item
                ? "bg-brand text-brand-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {templates.map((template) => (
          <li key={template.id}>
            <article className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card">
              <div
                className="h-1.5 w-full"
                style={{ backgroundColor: template.accent }}
                aria-hidden
              />
              <div className="flex flex-1 flex-col gap-4 p-5">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {template.category}
                  </p>
                  <h2 className="font-heading text-lg font-semibold tracking-tight">
                    {template.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                </div>

                <div className="space-y-2 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5 font-medium text-foreground">
                    <Columns3 className="size-3.5" aria-hidden />
                    Lists
                  </p>
                  <p className="leading-relaxed">
                    {template.lists.map((list) => list.name).join(" · ")}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-medium">
                    <Tag className="size-3.5 text-muted-foreground" aria-hidden />
                    Labels
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {template.labels.map((label) => (
                      <span
                        key={label.name}
                        className="rounded-md px-2 py-0.5 text-[11px] font-medium text-white"
                        style={{ backgroundColor: label.color }}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-auto pt-1">
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => setSelected(template)}
                  >
                    Use template
                  </Button>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>

      <UseTemplateDialog
        template={selected}
        workspaces={workspaces}
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
