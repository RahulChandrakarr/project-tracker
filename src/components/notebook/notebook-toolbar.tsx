"use client";

import * as React from "react";
import {
  BookOpen,
  Grid3x3,
  Maximize2,
  Minimize2,
  RectangleHorizontal,
  Square,
  SquareDashed,
} from "lucide-react";

import { SelectNative } from "@/components/ui/select-native";
import { updateNotebook, updatePageStyle } from "@/lib/notebook/mutations";
import { cn } from "@/lib/utils";
import {
  NOTEBOOK_THEMES,
  PAPER_LABEL,
  PAPER_STYLES,
  THEME_LABEL,
  type NotebookTheme,
  type PaperStyle,
} from "@/types/notebook";

import { useNotebook, useNotebookStore } from "./notebook-store";

export function NotebookToolbar() {
  const store = useNotebookStore();
  const title = useNotebook((s) => s.title);
  const theme = useNotebook((s) => s.theme);
  const viewMode = useNotebook((s) => s.viewMode);
  const fullscreen = useNotebook((s) => s.fullscreen);
  const notebookId = useNotebook((s) => s.notebookId);
  const pages = useNotebook((s) => s.pages);
  const currentIndex = useNotebook((s) => s.currentIndex);
  const page = pages[currentIndex] ?? pages[0];

  const titleTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  function onTitle(value: string) {
    store.getState().setTitle(value);
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      const v = value.trim();
      if (v) void updateNotebook(notebookId, { title: v });
    }, 600);
  }

  function onTheme(value: NotebookTheme) {
    store.getState().setTheme(value);
    void updateNotebook(notebookId, { theme: value });
  }

  function onPaper(value: PaperStyle) {
    store.getState().updatePage(page.id, { paper_style: value });
    void updatePageStyle(page.id, { paperStyle: value });
  }

  function toggle(key: "show_guides" | "rounded" | "shadow") {
    const next = !page[key];
    store.getState().updatePage(page.id, { [key]: next });
    const field =
      key === "show_guides" ? "showGuides" : key === "rounded" ? "rounded" : "shadow";
    void updatePageStyle(page.id, { [field]: next });
  }

  return (
    <div className="nb-topbar">
      <input
        value={title}
        onChange={(e) => onTitle(e.target.value)}
        aria-label="Notebook title"
        className="nb-title"
        maxLength={120}
      />

      <div className="nb-topbar-controls">
        {/* view mode */}
        <div className="nb-segment" role="group" aria-label="View mode">
          <button
            type="button"
            aria-pressed={viewMode === "single"}
            className={cn("nb-seg", viewMode === "single" && "nb-seg--on")}
            onClick={() => store.getState().setViewMode("single")}
            title="Single page"
          >
            <Square className="size-4" />
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "double"}
            className={cn("nb-seg", viewMode === "double" && "nb-seg--on")}
            onClick={() => store.getState().setViewMode("double")}
            title="Book view"
          >
            <BookOpen className="size-4" />
          </button>
        </div>

        <SelectNative
          aria-label="Theme"
          className="h-8 w-[150px] text-xs"
          value={theme}
          onChange={(e) => onTheme(e.currentTarget.value as NotebookTheme)}
        >
          {NOTEBOOK_THEMES.map((t) => (
            <option key={t} value={t}>
              {THEME_LABEL[t]}
            </option>
          ))}
        </SelectNative>

        <SelectNative
          aria-label="Paper style"
          className="h-8 w-[140px] text-xs"
          value={page.paper_style}
          onChange={(e) => onPaper(e.currentTarget.value as PaperStyle)}
        >
          {PAPER_STYLES.map((p) => (
            <option key={p} value={p}>
              {PAPER_LABEL[p]}
            </option>
          ))}
        </SelectNative>

        <div className="nb-segment" role="group" aria-label="Page style">
          <button
            type="button"
            aria-pressed={page.show_guides}
            className={cn("nb-seg", page.show_guides && "nb-seg--on")}
            onClick={() => toggle("show_guides")}
            title="Toggle paper guides"
          >
            <Grid3x3 className="size-4" />
          </button>
          <button
            type="button"
            aria-pressed={page.rounded}
            className={cn("nb-seg", page.rounded && "nb-seg--on")}
            onClick={() => toggle("rounded")}
            title="Rounded corners"
          >
            <RectangleHorizontal className="size-4" />
          </button>
          <button
            type="button"
            aria-pressed={page.shadow}
            className={cn("nb-seg", page.shadow && "nb-seg--on")}
            onClick={() => toggle("shadow")}
            title="Page shadow"
          >
            <SquareDashed className="size-4" />
          </button>
        </div>

        <button
          type="button"
          className="nb-seg nb-segment"
          onClick={() => store.getState().toggleFullscreen()}
          title={fullscreen ? "Exit focus mode" : "Focus mode"}
          aria-label={fullscreen ? "Exit focus mode" : "Focus mode"}
        >
          {fullscreen ? (
            <Minimize2 className="size-4" />
          ) : (
            <Maximize2 className="size-4" />
          )}
        </button>
      </div>
    </div>
  );
}
