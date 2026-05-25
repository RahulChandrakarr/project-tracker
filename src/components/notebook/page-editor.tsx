"use client";

import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";

import { updatePageContent } from "@/lib/notebook/mutations";
import type { Json } from "@/lib/supabase/types";

import { FormatToolbar, type SaveStatus } from "./format-toolbar";
import { notebookExtensions } from "./notebook-extensions";
import { PageSurface } from "./page-surface";
import { useNotebookStore, type PageState } from "./notebook-store";

/**
 * The writing surface for one page: a live tiptap editor with a format toolbar.
 * Edits autosave (debounced) to the page row, and flush once more on unmount so
 * switching pages never drops the last keystrokes.
 */
export function PageEditor({
  page,
  pageNumber,
}: {
  page: PageState;
  pageNumber: number;
}) {
  const store = useNotebookStore();
  const [status, setStatus] = React.useState<SaveStatus>("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = React.useRef<Json>(page.content);
  const dirty = React.useRef(false);

  const editor = useEditor({
    extensions: notebookExtensions(),
    content: page.content as JSONContent,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "nb-prose nb-editor focus:outline-none" },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON() as Json;
      latest.current = json;
      dirty.current = true;
      setStatus("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        try {
          await updatePageContent(page.id, json);
          store.getState().updatePage(page.id, { content: json });
          dirty.current = false;
          setStatus("saved");
        } catch {
          setStatus("idle");
        }
      }, 700);
    },
  });

  React.useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (dirty.current) {
        // Flush the latest content when leaving the page (fire-and-forget).
        void updatePageContent(page.id, latest.current);
        store.getState().updatePage(page.id, { content: latest.current });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id]);

  return (
    <div className="flex h-full flex-col gap-3">
      <FormatToolbar editor={editor} status={status} />
      <div className="min-h-0 flex-1">
        <PageSurface page={page} pageNumber={pageNumber}>
          {editor ? <EditorContent editor={editor} className="h-full" /> : null}
        </PageSurface>
      </div>
    </div>
  );
}
