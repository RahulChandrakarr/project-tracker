"use client";

import { createContext, useContext } from "react";
import { createStore, useStore } from "zustand";

import { pageFromRow, type PageState } from "@/lib/notebook/page-state";
import type { NotebookTheme } from "@/types/notebook";

export type { PageState };
export { pageFromRow };

export type ViewMode = "single" | "double";

type State = {
  notebookId: string;
  title: string;
  theme: NotebookTheme;
  pages: PageState[];
  currentIndex: number;
  viewMode: ViewMode;
  fullscreen: boolean;
  /**
   * When a page is filled and writing flows onto another page, the new page's
   * editor reads this on mount to claim the caret so typing continues there.
   */
  pendingFocusPageId: string | null;
};

type Actions = {
  goTo: (index: number) => void;
  next: () => void;
  prev: () => void;
  setViewMode: (mode: ViewMode) => void;
  toggleFullscreen: () => void;
  setTheme: (theme: NotebookTheme) => void;
  setTitle: (title: string) => void;
  setPages: (pages: PageState[]) => void;
  addPage: (page: PageState) => void;
  /** Append a page without moving the reader to it (used by auto-pagination). */
  appendPage: (page: PageState) => void;
  removePage: (id: string) => void;
  updatePage: (id: string, patch: Partial<PageState>) => void;
  reorder: (orderedIds: string[]) => void;
  requestFocus: (pageId: string) => void;
  clearFocus: () => void;
};

export type NotebookState = State & Actions;

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

export type NotebookStore = ReturnType<typeof createNotebookStore>;

export function createNotebookStore(init: Omit<State, "pendingFocusPageId">) {
  return createStore<NotebookState>((set) => ({
    ...init,
    pendingFocusPageId: null,
    goTo: (index) =>
      set((s) => ({ currentIndex: clamp(index, 0, s.pages.length - 1) })),
    next: () =>
      set((s) => ({
        currentIndex: clamp(s.currentIndex + 1, 0, s.pages.length - 1),
      })),
    prev: () =>
      set((s) => ({
        currentIndex: clamp(s.currentIndex - 1, 0, s.pages.length - 1),
      })),
    setViewMode: (viewMode) => set({ viewMode }),
    toggleFullscreen: () => set((s) => ({ fullscreen: !s.fullscreen })),
    setTheme: (theme) => set({ theme }),
    setTitle: (title) => set({ title }),
    setPages: (pages) => set({ pages }),
    addPage: (page) =>
      set((s) => ({ pages: [...s.pages, page], currentIndex: s.pages.length })),
    appendPage: (page) => set((s) => ({ pages: [...s.pages, page] })),
    removePage: (id) =>
      set((s) => {
        const pages = s.pages.filter((p) => p.id !== id);
        return {
          pages,
          currentIndex: clamp(s.currentIndex, 0, pages.length - 1),
        };
      }),
    updatePage: (id, patch) =>
      set((s) => ({
        pages: s.pages.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      })),
    reorder: (orderedIds) =>
      set((s) => {
        const byId = new Map(s.pages.map((p) => [p.id, p]));
        const pages = orderedIds
          .map((id) => byId.get(id))
          .filter((p): p is PageState => Boolean(p));
        return { pages };
      }),
    requestFocus: (pageId) => set({ pendingFocusPageId: pageId }),
    clearFocus: () => set({ pendingFocusPageId: null }),
  }));
}

const StoreContext = createContext<NotebookStore | null>(null);

export const NotebookStoreProvider = StoreContext.Provider;

export function useNotebook<T>(selector: (s: NotebookState) => T): T {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("useNotebook must be used within NotebookStoreProvider");
  }
  return useStore(store, selector);
}

/** Access the raw store (for getState/setState outside of render). */
export function useNotebookStore(): NotebookStore {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("useNotebookStore must be used within NotebookStoreProvider");
  }
  return store;
}
