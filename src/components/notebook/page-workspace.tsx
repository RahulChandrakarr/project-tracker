"use client";

import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { Brush, PenLine } from "lucide-react";

import {
  addPage,
  updatePageContent,
  updatePageDrawing,
  updatePageStyle,
} from "@/lib/notebook/mutations";
import type { Json } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

import { DrawingCanvas } from "./drawing-canvas";
import { DrawingToolbar } from "./drawing-toolbar";
import { asDrawing, type Drawing, type DrawTool, type Stroke } from "./drawing";
import { FormatToolbar, type SaveStatus } from "./format-toolbar";
import { notebookExtensions } from "./notebook-extensions";
import { PageSurface } from "./page-surface";
import {
  pageFromRow,
  useNotebook,
  useNotebookStore,
  type PageState,
} from "./notebook-store";

type Mode = "write" | "draw";

/**
 * The active page in single-page mode. Hosts both layers — a tiptap text editor
 * and a freehand drawing canvas overlay — and toggles which one is interactive.
 * Text and drawing each autosave (debounced) to the page row, and text flushes
 * once more on unmount so switching pages never drops keystrokes.
 */
export function PageWorkspace({
  page,
  pageNumber,
}: {
  page: PageState;
  pageNumber: number;
}) {
  const store = useNotebookStore();
  const [mode, setMode] = React.useState<Mode>("write");

  // ----- page title -----
  const [title, setTitle] = React.useState(page.title ?? "");
  const titleTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTitle = React.useRef(page.title ?? "");
  const titleDirty = React.useRef(false);

  function onTitle(value: string) {
    setTitle(value);
    latestTitle.current = value;
    titleDirty.current = true;
    const next = value.trim() ? value : null;
    store.getState().updatePage(page.id, { title: next });
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      void updatePageStyle(page.id, { title: next });
      titleDirty.current = false;
    }, 600);
  }

  // ----- text layer (tiptap) -----
  const [status, setStatus] = React.useState<SaveStatus>("idle");
  const textTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContent = React.useRef<Json>(page.content);
  const contentDirty = React.useRef(false);

  // ----- auto-pagination (overflow flows onto the next page) -----
  const balancing = React.useRef(false);
  const paginateRaf = React.useRef<number | null>(null);
  const paginateRef = React.useRef<() => void>(() => {});

  const editor = useEditor({
    extensions: notebookExtensions(),
    content: page.content as JSONContent,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "nb-prose nb-editor focus:outline-none" },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON() as Json;
      latestContent.current = json;
      contentDirty.current = true;
      setStatus("saving");
      if (textTimer.current) clearTimeout(textTimer.current);
      textTimer.current = setTimeout(async () => {
        try {
          await updatePageContent(page.id, json);
          store.getState().updatePage(page.id, { content: json });
          contentDirty.current = false;
          setStatus("saved");
        } catch {
          setStatus("idle");
        }
      }, 700);
      // Re-check overflow once the new content has laid out.
      if (paginateRaf.current) cancelAnimationFrame(paginateRaf.current);
      paginateRaf.current = requestAnimationFrame(() => paginateRef.current());
    },
  });

  /**
   * If the page is overfull, move the trailing block(s) that don't fit onto the
   * next page (opening one when this is the last page). Splitting at top-level
   * block boundaries keeps paragraphs and lists whole. When the caret sits in
   * the moved text, follow it to the next page so writing continues seamlessly;
   * otherwise the reflow is silent and the caret stays put.
   */
  const paginate = React.useCallback(async () => {
    if (!editor || editor.isDestroyed || balancing.current) return;

    const pm = editor.view.dom as HTMLElement;
    const container = pm.closest(".nb-page-scroll") as HTMLElement | null;
    if (!container || container.clientHeight === 0) return;

    const padBottom =
      parseFloat(getComputedStyle(container).paddingBottom) || 0;
    const usableBottom = container.clientHeight - padBottom;

    const blocks = Array.from(pm.children) as HTMLElement[];
    let cut = -1;
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (b.offsetTop + b.offsetHeight > usableBottom + 2) {
        cut = i;
        break;
      }
    }
    // Nothing overflows, or a single block is taller than the whole page (can't
    // be split at block level) — leave it scrolling rather than empty the page.
    if (cut <= 0) return;

    const json = editor.getJSON();
    const content = Array.isArray(json.content) ? json.content : [];
    if (cut >= content.length) return;
    const move = content.slice(cut);
    if (move.length === 0) return;

    // Document position where the moved blocks begin, and whether the caret is
    // inside that range.
    const doc = editor.state.doc;
    let cutPos = 0;
    for (let i = 0; i < cut && i < doc.childCount; i++) {
      cutPos += doc.child(i).nodeSize;
    }
    const follow = editor.state.selection.from >= cutPos;

    balancing.current = true;
    try {
      const state = store.getState();
      const idx = state.pages.findIndex((p) => p.id === page.id);
      if (idx === -1) return;
      const moveDoc = { type: "doc", content: move } as unknown as Json;

      // Trim the tail off this page. A delete keeps the caret mapped, so a
      // silent reflow never yanks the reader to the top.
      editor.view.dispatch(
        editor.state.tr.delete(cutPos, editor.state.doc.content.size),
      );

      if (idx === state.pages.length - 1) {
        // Writing at the end of the book: open a fresh page for the overflow.
        const row = await addPage(state.notebookId);
        store.getState().appendPage({ ...pageFromRow(row), content: moveDoc });
        await updatePageContent(row.id, moveDoc);
        if (follow) {
          store.getState().goTo(idx + 1);
          store.getState().requestFocus(row.id);
        }
      } else {
        // Editing mid-book: push the overflow onto the front of the next page.
        const next = state.pages[idx + 1];
        const nextContent =
          (next.content as { content?: unknown[] } | null)?.content ?? [];
        const merged = {
          type: "doc",
          content: [...move, ...nextContent],
        } as unknown as Json;
        store.getState().updatePage(next.id, { content: merged });
        await updatePageContent(next.id, merged);
        if (follow) {
          store.getState().goTo(idx + 1);
          store.getState().requestFocus(next.id);
        }
      }
    } finally {
      balancing.current = false;
    }
  }, [editor, page.id, store]);

  React.useEffect(() => {
    paginateRef.current = paginate;
  }, [paginate]);

  // Resolve any pre-existing overflow once the editor is ready (also lets a
  // reflow cascade down the book as pages mount).
  React.useEffect(() => {
    if (!editor) return;
    const id = requestAnimationFrame(() => paginateRef.current());
    return () => cancelAnimationFrame(id);
  }, [editor]);

  // Claim the caret when writing has just flowed onto this page.
  const pendingFocusPageId = useNotebook((s) => s.pendingFocusPageId);
  React.useEffect(() => {
    if (!editor || pendingFocusPageId !== page.id) return;
    const id = requestAnimationFrame(() => {
      editor.commands.focus("end");
      store.getState().clearFocus();
    });
    return () => cancelAnimationFrame(id);
  }, [editor, pendingFocusPageId, page.id, store]);

  React.useEffect(() => {
    editor?.setEditable(mode === "write");
  }, [editor, mode]);

  // ----- drawing layer -----
  const [drawing, setDrawing] = React.useState<Drawing>(() =>
    asDrawing(page.drawing),
  );
  const [redo, setRedo] = React.useState<Stroke[]>([]);
  const [tool, setTool] = React.useState<DrawTool>("pen");
  const [color, setColor] = React.useState("#1c1d22");
  const [brush, setBrush] = React.useState(1);
  const drawTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const drawingMounted = React.useRef(false);

  // Debounced drawing autosave; skips the initial loaded value.
  React.useEffect(() => {
    if (!drawingMounted.current) {
      drawingMounted.current = true;
      return;
    }
    if (drawTimer.current) clearTimeout(drawTimer.current);
    drawTimer.current = setTimeout(async () => {
      const payload = drawing as unknown as Json;
      try {
        await updatePageDrawing(page.id, payload);
        store.getState().updatePage(page.id, { drawing: payload });
      } catch {
        /* ignore autosave error */
      }
    }, 600);
  }, [drawing, page.id, store]);

  const commitStroke = React.useCallback((stroke: Stroke) => {
    setDrawing((d) => ({ strokes: [...d.strokes, stroke] }));
    setRedo([]);
  }, []);

  function undo() {
    if (drawing.strokes.length === 0) return;
    const last = drawing.strokes[drawing.strokes.length - 1];
    setDrawing({ strokes: drawing.strokes.slice(0, -1) });
    setRedo((r) => [...r, last]);
  }
  function redoStroke() {
    if (redo.length === 0) return;
    const stroke = redo[redo.length - 1];
    setRedo(redo.slice(0, -1));
    setDrawing({ strokes: [...drawing.strokes, stroke] });
  }
  function clearDrawing() {
    setDrawing({ strokes: [] });
    setRedo([]);
  }

  // Flush the text layer on unmount (page switch).
  React.useEffect(() => {
    return () => {
      if (textTimer.current) clearTimeout(textTimer.current);
      if (drawTimer.current) clearTimeout(drawTimer.current);
      if (titleTimer.current) clearTimeout(titleTimer.current);
      if (paginateRaf.current) cancelAnimationFrame(paginateRaf.current);
      if (contentDirty.current) {
        void updatePageContent(page.id, latestContent.current);
        store.getState().updatePage(page.id, { content: latestContent.current });
      }
      if (titleDirty.current) {
        void updatePageStyle(page.id, {
          title: latestTitle.current.trim() ? latestTitle.current : null,
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id]);

  return (
    <div className="flex h-full flex-col gap-3">
      <input
        value={title}
        onChange={(e) => onTitle(e.target.value)}
        placeholder="Untitled page"
        aria-label="Page title"
        maxLength={120}
        className="nb-page-title"
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="nb-segment" role="group" aria-label="Page mode">
          <button
            type="button"
            aria-pressed={mode === "write"}
            className={cn("nb-seg", mode === "write" && "nb-seg--on")}
            onClick={() => setMode("write")}
            title="Write"
          >
            <PenLine className="size-4" />
          </button>
          <button
            type="button"
            aria-pressed={mode === "draw"}
            className={cn("nb-seg", mode === "draw" && "nb-seg--on")}
            onClick={() => setMode("draw")}
            title="Draw"
          >
            <Brush className="size-4" />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          {mode === "write" ? (
            <FormatToolbar editor={editor} status={status} />
          ) : (
            <DrawingToolbar
              tool={tool}
              setTool={setTool}
              color={color}
              setColor={setColor}
              size={brush}
              setSize={setBrush}
              onUndo={undo}
              onRedo={redoStroke}
              onClear={clearDrawing}
              canUndo={drawing.strokes.length > 0}
              canRedo={redo.length > 0}
            />
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <PageSurface
          page={page}
          pageNumber={pageNumber}
          overlay={
            <DrawingCanvas
              editable={mode === "draw"}
              drawing={drawing}
              tool={tool}
              color={color}
              size={brush}
              onCommit={commitStroke}
            />
          }
        >
          {editor ? <EditorContent editor={editor} className="h-full" /> : null}
        </PageSurface>
      </div>
    </div>
  );
}
