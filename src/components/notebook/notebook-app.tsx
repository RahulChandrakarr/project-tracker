"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import type { NotebookTheme } from "@/types/notebook";

import { NotebookCanvas } from "./notebook-canvas";
import { NotebookSidebar } from "./notebook-sidebar";
import { NotebookToolbar } from "./notebook-toolbar";
import { themeVars } from "./notebook-theme";
import {
  createNotebookStore,
  NotebookStoreProvider,
  useNotebook,
  type ExportProject,
  type PageState,
} from "./notebook-store";

/**
 * Root of the private notebook experience. Spins up a per-mount zustand store
 * from the server-loaded data and provides it to the toolbar, sidebar, and
 * canvas. The theme's CSS variables are applied at the root so every nested
 * page picks up the palette.
 */
export function NotebookApp({
  notebookId,
  title,
  theme,
  pages,
  projects,
}: {
  notebookId: string;
  title: string;
  theme: NotebookTheme;
  pages: PageState[];
  projects: ExportProject[];
}) {
  const [store] = React.useState(() =>
    createNotebookStore({
      notebookId,
      title,
      theme,
      pages,
      projects,
      currentIndex: 0,
      viewMode: "single",
      fullscreen: false,
    }),
  );

  return (
    <NotebookStoreProvider value={store}>
      <NotebookShell />
    </NotebookStoreProvider>
  );
}

function NotebookShell() {
  const theme = useNotebook((s) => s.theme);
  const fullscreen = useNotebook((s) => s.fullscreen);

  return (
    <div
      className={cn("nb-root", fullscreen && "nb-root--full")}
      style={themeVars(theme)}
    >
      <NotebookToolbar />
      <div className="nb-body">
        <NotebookSidebar />
        <main className="nb-main">
          <NotebookCanvas />
        </main>
      </div>
    </div>
  );
}
