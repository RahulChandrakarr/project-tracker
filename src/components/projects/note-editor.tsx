"use client";

import * as React from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Strikethrough,
  Unlink,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Rich-text schema for notes: text styling plus the two things asked for,
 * bullet/numbered lists and links. Headings are left out to keep notes flat;
 * StarterKit v3 bundles the Link mark so it isn't added separately.
 */
export function noteExtensions(placeholder: string) {
  return [
    // Links stay editable inside the editor (no navigation on click); headings
    // are dropped to keep notes flat.
    StarterKit.configure({
      heading: false,
      link: { openOnClick: false },
    }),
    Placeholder.configure({ placeholder }),
  ];
}

/** Whether a stored note body is rich HTML (vs a plain-text legacy note). */
export function isNoteHtml(body: string): boolean {
  return /<[a-z][\s\S]*>/i.test(body);
}

/**
 * Defence-in-depth sanitiser for stored note HTML. The content originates from
 * the editor (a constrained schema), but a hand-crafted POST could carry
 * anything, so before we render it with `dangerouslySetInnerHTML` we strip the
 * realistic XSS vectors: script-like elements, inline event handlers, and
 * `javascript:` URLs. Runs identically on the server and client (no DOM), so
 * the rendered markup matches across hydration.
 */
export function sanitizeNoteHtml(html: string): string {
  return html
    .replace(/<\/?(script|style|iframe|object|embed|link|meta)\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/(href|src)\s*=\s*"\s*javascript:[^"]*"/gi, '$1="#"')
    .replace(/(href|src)\s*=\s*'\s*javascript:[^']*'/gi, "$1='#'");
}

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

function NoteToolbar({ editor }: { editor: Editor }) {
  const [, force] = React.useReducer((x: number) => x + 1, 0);

  React.useEffect(() => {
    const update = () => force();
    editor.on("transaction", update);
    return () => {
      editor.off("transaction", update);
    };
  }, [editor]);

  const chain = () => editor.chain().focus();

  // Prompt for a URL, seeding the box with any link already on the selection so
  // editing an existing link is one step. A blank submission clears the link.
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
 * Read-only render of a stored note body. Rich notes (HTML) are sanitised and
 * rendered with the shared note typography; legacy plain-text notes keep their
 * line breaks via `whitespace-pre-wrap`. `clamp` truncates the list preview to
 * a few lines.
 */
export function NoteBody({
  body,
  clamp = false,
}: {
  body: string;
  clamp?: boolean;
}) {
  const sanitized = React.useMemo(
    () => (isNoteHtml(body) ? sanitizeNoteHtml(body) : null),
    [body],
  );

  if (sanitized === null) {
    return (
      <p
        className={cn(
          "whitespace-pre-wrap break-words text-sm",
          clamp && "line-clamp-3",
        )}
      >
        {body}
      </p>
    );
  }

  return (
    <div
      className={cn("note-prose text-sm", clamp && "line-clamp-3")}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

/**
 * Rich-text note input. Mirrors the editor's HTML into a hidden field so it
 * posts through the existing note server actions with no client wiring. The
 * value is emptied when the note has no text, so the `body` min-length check
 * still rejects a blank note. Remount (via `key`) to reset after submit.
 */
export function NoteEditor({
  name,
  defaultValue = "",
  placeholder = "Add a note. Select text and use the link button to turn it into a link.",
  autoFocus = false,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [html, setHtml] = React.useState(defaultValue);

  const editor = useEditor({
    // Server render would mismatch the editor's client-only DOM; defer it.
    immediatelyRender: false,
    autofocus: autoFocus ? "end" : false,
    extensions: noteExtensions(placeholder),
    content: defaultValue || "",
    editorProps: {
      attributes: {
        class: "note-prose min-h-[5rem] px-3 py-2 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      setHtml(editor.getText().trim() === "" ? "" : editor.getHTML());
    },
  });

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)]">
      {editor ? <NoteToolbar editor={editor} /> : null}
      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
