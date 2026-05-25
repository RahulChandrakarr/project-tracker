"use client";

import * as React from "react";
import type { Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline,
  Undo2,
  Redo2,
  Baseline,
  Ban,
} from "lucide-react";

import { Popover } from "@/components/ui/popover";
import { SelectNative } from "@/components/ui/select-native";
import { cn } from "@/lib/utils";

import {
  FONT_CHOICES,
  HIGHLIGHT_SWATCHES,
  INK_SWATCHES,
} from "./notebook-extensions";

export type SaveStatus = "idle" | "saving" | "saved";

function Btn({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn("nb-toolbtn", active && "nb-toolbtn--active")}
    >
      {children}
    </button>
  );
}

const Divider = () => <span aria-hidden className="nb-tooldiv" />;

/**
 * Floating rich-text toolbar bound to a tiptap editor. Re-renders on every
 * editor transaction so the active states stay in sync with the selection.
 */
export function FormatToolbar({
  editor,
  status,
}: {
  editor: Editor | null;
  status: SaveStatus;
}) {
  const [, force] = React.useReducer((x: number) => x + 1, 0);

  React.useEffect(() => {
    if (!editor) return;
    const update = () => force();
    editor.on("transaction", update);
    return () => {
      editor.off("transaction", update);
    };
  }, [editor]);

  if (!editor) return null;
  const chain = () => editor.chain().focus();

  return (
    <div className="nb-toolbar">
      <Btn label="Undo" onClick={() => chain().undo().run()}>
        <Undo2 className="size-4" />
      </Btn>
      <Btn label="Redo" onClick={() => chain().redo().run()}>
        <Redo2 className="size-4" />
      </Btn>
      <Divider />

      <Btn
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => chain().toggleBold().run()}
      >
        <Bold className="size-4" />
      </Btn>
      <Btn
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => chain().toggleItalic().run()}
      >
        <Italic className="size-4" />
      </Btn>
      <Btn
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => chain().toggleUnderline().run()}
      >
        <Underline className="size-4" />
      </Btn>
      <Btn
        label="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => chain().toggleStrike().run()}
      >
        <Strikethrough className="size-4" />
      </Btn>
      <Divider />

      {([1, 2, 3] as const).map((level) => {
        const Icon = level === 1 ? Heading1 : level === 2 ? Heading2 : Heading3;
        return (
          <Btn
            key={level}
            label={`Heading ${level}`}
            active={editor.isActive("heading", { level })}
            onClick={() => chain().toggleHeading({ level }).run()}
          >
            <Icon className="size-4" />
          </Btn>
        );
      })}
      <Divider />

      <Btn
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => chain().toggleBulletList().run()}
      >
        <List className="size-4" />
      </Btn>
      <Btn
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => chain().toggleOrderedList().run()}
      >
        <ListOrdered className="size-4" />
      </Btn>
      <Btn
        label="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => chain().toggleBlockquote().run()}
      >
        <Quote className="size-4" />
      </Btn>
      <Divider />

      <Btn
        label="Align left"
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => chain().setTextAlign("left").run()}
      >
        <AlignLeft className="size-4" />
      </Btn>
      <Btn
        label="Align center"
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => chain().setTextAlign("center").run()}
      >
        <AlignCenter className="size-4" />
      </Btn>
      <Btn
        label="Align right"
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => chain().setTextAlign("right").run()}
      >
        <AlignRight className="size-4" />
      </Btn>
      <Divider />

      <Popover
        align="start"
        triggerLabel="Text colour"
        triggerClassName="nb-toolbtn"
        trigger={<Baseline className="size-4" />}
      >
        {({ close }) => (
          <div className="flex w-40 flex-col gap-2 p-1">
            <div className="grid grid-cols-4 gap-1.5">
              {INK_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Text colour ${c}`}
                  className="size-7 rounded-md border border-[var(--color-border)]"
                  style={{ background: c }}
                  onClick={() => {
                    editor.chain().focus().setColor(c).run();
                    close();
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              className="flex items-center gap-2 rounded-sm px-2 py-1 text-left text-sm hover:bg-[var(--color-accent)]"
              onClick={() => {
                editor.chain().focus().unsetColor().run();
                close();
              }}
            >
              <Ban className="size-4" /> Default
            </button>
          </div>
        )}
      </Popover>

      <Popover
        align="start"
        triggerLabel="Highlight"
        triggerClassName={cn(
          "nb-toolbtn",
          editor.isActive("highlight") && "nb-toolbtn--active",
        )}
        trigger={<Highlighter className="size-4" />}
      >
        {({ close }) => (
          <div className="flex w-40 flex-col gap-2 p-1">
            <div className="grid grid-cols-5 gap-1.5">
              {HIGHLIGHT_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Highlight ${c}`}
                  className="size-7 rounded-md border border-[var(--color-border)]"
                  style={{ background: c }}
                  onClick={() => {
                    editor.chain().focus().toggleHighlight({ color: c }).run();
                    close();
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              className="flex items-center gap-2 rounded-sm px-2 py-1 text-left text-sm hover:bg-[var(--color-accent)]"
              onClick={() => {
                editor.chain().focus().unsetHighlight().run();
                close();
              }}
            >
              <Ban className="size-4" /> None
            </button>
          </div>
        )}
      </Popover>

      <SelectNative
        aria-label="Font"
        className="h-8 w-[120px] text-xs"
        value={editor.getAttributes("textStyle").fontFamily ?? ""}
        onChange={(e) => {
          const value = e.currentTarget.value;
          if (value) editor.chain().focus().setFontFamily(value).run();
          else editor.chain().focus().unsetFontFamily().run();
        }}
      >
        {FONT_CHOICES.map((f) => (
          <option key={f.label} value={f.value}>
            {f.label}
          </option>
        ))}
      </SelectNative>

      <span className="nb-savehint ml-auto">
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}
      </span>
    </div>
  );
}
