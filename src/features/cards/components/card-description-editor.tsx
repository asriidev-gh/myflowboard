"use client";

import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List, ListOrdered, Code } from "lucide-react";
import { useEffect } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CardDescriptionEditorProps {
  initialContent: unknown;
  canEdit: boolean;
  onSave: (json: object | null) => void;
}

export function CardDescriptionEditor({
  initialContent,
  canEdit,
  onSave,
}: CardDescriptionEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder: "Add a more detailed description…",
      }),
    ],
    content:
      initialContent && typeof initialContent === "object"
        ? (initialContent as object)
        : undefined,
    editable: canEdit,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-24 focus:outline-none px-1 py-1",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(canEdit);
  }, [editor, canEdit]);

  if (!editor) {
    return (
      <div className="h-24 animate-pulse rounded-lg bg-muted/60" aria-hidden />
    );
  }

  return (
    <div className="space-y-2 rounded-xl border bg-card p-2">
      {canEdit ? (
        <div className="flex flex-wrap gap-1 border-b pb-2">
          <ToolbarButton
            label="Bold"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Bullet list"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Code block"
            active={editor.isActive("codeBlock")}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <Code className="size-3.5" />
          </ToolbarButton>
        </div>
      ) : null}
      <EditorContent editor={editor} />
      {canEdit ? (
        <div className="flex justify-end">
          <button
            type="button"
            className={cn(buttonVariants({ size: "sm" }))}
            onClick={() => {
              const json = editor.getJSON();
              const isEmpty =
                !json.content ||
                (json.content.length === 1 &&
                  json.content[0]?.type === "paragraph" &&
                  !json.content[0].content);
              onSave(isEmpty ? null : json);
            }}
          >
            Save description
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ToolbarButton({
  children,
  label,
  active,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon-sm" }),
        active && "bg-accent",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
