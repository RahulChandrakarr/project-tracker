"use client";

import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { Brush, PenLine } from "lucide-react";

import {
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
import { useNotebookStore, type PageState } from "./notebook-store";

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
    },
  });

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
