"use client";

import * as React from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Strikethrough,
  Unlink,
} from "lucide-react";

import { noteExtensions } from "@/components/projects/note-editor";
import { cn } from "@/lib/utils";

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "grid size-7 place-items-center rounded text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]",
        active &&
          "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const [, force] = React.useReducer((x: number) => x + 1, 0);

  React.useEffect(() => {
    const update = () => force();
    editor.on("transaction", update);
    return () => {
      editor.off("transaction", update);
    };
  }, [editor]);

  const chain = () => editor.chain().focus();

  const setLink = () => {
    const current = (editor.getAttributes("link").href as string) ?? "";
    const input = window.prompt("Link URL (leave blank to remove)", current);
    if (input === null) return;
    const url = input.trim();
    if (url === "") {
      chain().extendMarkRange("link").unsetLink().run();
      return;
    }
    const href = /^(https?:|mailto:)/i.test(url) ? url : `https://${url}`;
    chain().extendMarkRange("link").setLink({ href }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--color-border)] px-1.5 py-1">
      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => chain().toggleBold().run()}
      >
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => chain().toggleItalic().run()}
      >
        <Italic className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => chain().toggleStrike().run()}
      >
        <Strikethrough className="size-4" />
      </ToolbarButton>
      <span aria-hidden className="mx-1 h-4 w-px bg-[var(--color-border)]" />
      <ToolbarButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => chain().toggleBulletList().run()}
      >
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => chain().toggleOrderedList().run()}
      >
        <ListOrdered className="size-4" />
      </ToolbarButton>
      <span aria-hidden className="mx-1 h-4 w-px bg-[var(--color-border)]" />
      <ToolbarButton
        label="Add or edit link"
        active={editor.isActive("link")}
        onClick={setLink}
      >
        <LinkIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Remove link"
        onClick={() => chain().extendMarkRange("link").unsetLink().run()}
      >
        <Unlink className="size-4" />
      </ToolbarButton>
    </div>
  );
}

/**
 * Full rich-text editor (bold/italic/strike/lists/links) for inline notes.
 * Uncontrolled: seeded from `defaultValue` on mount, reports HTML via
 * `onChange`. Empty content reports "" so callers can treat it as no notes.
 */
export function RichTextField({
  defaultValue,
  onChange,
  placeholder,
}: {
  defaultValue: string;
  onChange: (html: string) => void;
  placeholder: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: noteExtensions(placeholder),
    content: defaultValue,
    editorProps: {
      attributes: {
        class: "note-prose min-h-[5rem] px-3 py-2 focus:outline-none",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getText().trim() === "" ? "" : ed.getHTML());
    },
  });

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)]">
      {editor ? <Toolbar editor={editor} /> : null}
      <EditorContent editor={editor} />
    </div>
  );
}
