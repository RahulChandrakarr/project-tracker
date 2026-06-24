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

import {
  noteExtensions,
  NoteBody,
} from "@/components/projects/note-editor";
import { upsertDailyLog } from "@/lib/calendar/mutations";
import { cn } from "@/lib/utils";

type SaveStatus = "idle" | "saving" | "saved" | "error";

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

function WorkLogToolbar({ editor }: { editor: Editor }) {
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
 * Autosaving rich-text editor for a single day's work log. Read-only when
 * viewing someone else's calendar.
 */
export function WorkLogEditor({
  date,
  defaultBody,
  canEdit,
}: {
  date: string;
  defaultBody: string | null;
  canEdit: boolean;
}) {
  const [status, setStatus] = React.useState<SaveStatus>("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestHtml = React.useRef(defaultBody ?? "");
  const dirty = React.useRef(false);

  const save = React.useCallback(async (html: string) => {
    setStatus("saving");
    const result = await upsertDailyLog(date, html);
    setStatus(result.ok ? "saved" : "error");
    if (result.ok) dirty.current = false;
  }, [date]);

  const editor = useEditor({
    immediatelyRender: false,
    editable: canEdit,
    extensions: noteExtensions(
      "Write what you worked on today — meetings, progress, blockers…",
    ),
    content: defaultBody ?? "",
    editorProps: {
      attributes: {
        class: "note-prose min-h-[8rem] px-3 py-2 focus:outline-none",
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (!canEdit) return;
      const html = ed.getText().trim() === "" ? "" : ed.getHTML();
      latestHtml.current = html;
      dirty.current = true;
      setStatus("idle");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void save(html);
      }, 600);
    },
  });

  React.useEffect(() => {
    if (!editor) return;
    editor.setEditable(canEdit);
    const next = defaultBody ?? "";
    if (next !== latestHtml.current) {
      editor.commands.setContent(next || "");
      latestHtml.current = next;
      dirty.current = false;
    }
  }, [date, defaultBody, canEdit, editor]);

  React.useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (dirty.current && canEdit) {
        void save(latestHtml.current);
      }
    };
  }, [canEdit, save]);

  if (!canEdit) {
    if (!defaultBody) {
      return (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          No work log for this day.
        </p>
      );
    }
    return <NoteBody body={defaultBody} />;
  }

  const statusLabel =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? "Saved"
        : status === "error"
          ? "Save failed"
          : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)]">
        {editor ? <WorkLogToolbar editor={editor} /> : null}
        <EditorContent editor={editor} />
      </div>
      {statusLabel ? (
        <p
          className="text-xs text-[var(--color-muted-foreground)]"
          aria-live="polite"
        >
          {statusLabel}
        </p>
      ) : null}
    </div>
  );
}
