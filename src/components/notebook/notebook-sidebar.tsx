"use client";

import * as React from "react";
import { generateText, type JSONContent } from "@tiptap/core";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Bookmark,
  Copy,
  GripVertical,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import {
  addPage,
  deletePage,
  duplicatePage,
  reorderPages,
  updatePageStyle,
} from "@/lib/notebook/mutations";
import { cn } from "@/lib/utils";

import { notebookExtensions } from "./notebook-extensions";
import {
  pageFromRow,
  useNotebook,
  useNotebookStore,
  type PageState,
} from "./notebook-store";

function excerpt(content: PageState["content"]): string {
  try {
    const text = generateText(content as JSONContent, notebookExtensions(), {
      blockSeparator: " ",
    }).trim();
    return text.length > 70 ? `${text.slice(0, 70)}…` : text;
  } catch {
    return "";
  }
}

export function NotebookSidebar() {
  const store = useNotebookStore();
  const notebookId = useNotebook((s) => s.notebookId);
  const pages = useNotebook((s) => s.pages);
  const currentIndex = useNotebook((s) => s.currentIndex);

  const [query, setQuery] = React.useState("");
  const [bookmarksOnly, setBookmarksOnly] = React.useState(false);
  const filtering = query.trim() !== "" || bookmarksOnly;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const visible = pages
    .map((page, index) => ({ page, index }))
    .filter(({ page }) => {
      if (bookmarksOnly && !page.bookmarked) return false;
      if (query.trim()) {
        const haystack = `${page.title ?? ""} ${excerpt(page.content)}`.toLowerCase();
        if (!haystack.includes(query.trim().toLowerCase())) return false;
      }
      return true;
    });

  async function onAdd() {
    const row = await addPage(notebookId);
    store.getState().addPage(pageFromRow(row));
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = pages.map((p) => p.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    const ordered = arrayMove(ids, from, to);
    store.getState().reorder(ordered);
    await reorderPages(notebookId, ordered);
  }

  return (
    <aside className="nb-sidebar">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold" style={{ color: "var(--nb-ink)" }}>
          Pages
          <span className="ml-1.5 text-xs" style={{ color: "var(--nb-ink-soft)" }}>
            {pages.length}
          </span>
        </h2>
        <button
          type="button"
          onClick={onAdd}
          className="nb-chip"
          aria-label="Add page"
          title="Add page"
        >
          <Plus className="size-4" />
          New
        </button>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2"
          style={{ color: "var(--nb-ink-soft)" }}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pages"
          className="nb-search"
        />
      </div>

      <button
        type="button"
        onClick={() => setBookmarksOnly((v) => !v)}
        className={cn("nb-chip self-start", bookmarksOnly && "nb-chip--on")}
      >
        <Bookmark
          className={cn("size-3.5", bookmarksOnly && "fill-current")}
        />
        Bookmarks
      </button>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={pages.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="flex flex-col gap-2 overflow-y-auto pr-0.5">
            {visible.map(({ page, index }) => (
              <PageItem
                key={page.id}
                page={page}
                index={index}
                active={index === currentIndex}
                canDrag={!filtering}
                canDelete={pages.length > 1}
              />
            ))}
            {visible.length === 0 ? (
              <li
                className="px-2 py-6 text-center text-xs"
                style={{ color: "var(--nb-ink-soft)" }}
              >
                No pages match.
              </li>
            ) : null}
          </ul>
        </SortableContext>
      </DndContext>
    </aside>
  );
}

function PageItem({
  page,
  index,
  active,
  canDrag,
  canDelete,
}: {
  page: PageState;
  index: number;
  active: boolean;
  canDrag: boolean;
  canDelete: boolean;
}) {
  const store = useNotebookStore();
  const notebookId = useNotebook((s) => s.notebookId);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: page.id, disabled: !canDrag });

  const text = excerpt(page.content);

  async function onBookmark(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !page.bookmarked;
    store.getState().updatePage(page.id, { bookmarked: next });
    await updatePageStyle(page.id, { bookmarked: next });
  }

  async function onDuplicate(e: React.MouseEvent) {
    e.stopPropagation();
    const row = await duplicatePage(page.id);
    store.getState().addPage(pageFromRow(row));
  }

  async function onDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!canDelete) return;
    const res = await deletePage(page.id, notebookId);
    if (res.ok) store.getState().removePage(page.id);
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("nb-pageitem", active && "nb-pageitem--active", isDragging && "opacity-60")}
      onClick={() => store.getState().goTo(index)}
    >
      <div className="flex items-start gap-2">
        {canDrag ? (
          <button
            type="button"
            className="nb-grip"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="size-4" />
          </button>
        ) : (
          <span className="nb-grip opacity-0" aria-hidden>
            <GripVertical className="size-4" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs tabular-nums" style={{ color: "var(--nb-ink-soft)" }}>
              {index + 1}
            </span>
            <span className="truncate text-sm font-medium" style={{ color: "var(--nb-ink)" }}>
              {page.title || "Untitled page"}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs" style={{ color: "var(--nb-ink-soft)" }}>
            {text || "Empty page"}
          </p>
        </div>
      </div>

      <div className="nb-pageitem-actions">
        <button type="button" onClick={onBookmark} aria-label="Bookmark" title="Bookmark">
          <Bookmark className={cn("size-3.5", page.bookmarked && "fill-current")} />
        </button>
        <button type="button" onClick={onDuplicate} aria-label="Duplicate page" title="Duplicate">
          <Copy className="size-3.5" />
        </button>
        {canDelete ? (
          <button type="button" onClick={onDelete} aria-label="Delete page" title="Delete">
            <Trash2 className="size-3.5" />
          </button>
        ) : null}
      </div>
    </li>
  );
}
