import type { Json } from "@/lib/supabase/types";
import { DEFAULT_PAPER, isPaperStyle, type PaperStyle } from "@/types/notebook";

import type { NotebookPage } from "./queries";

/**
 * The client-side shape of a page (a subset of the DB row). Lives in a plain
 * module so both the server route and the client store can use it and the
 * row-to-state mapper.
 */
export type PageState = {
  id: string;
  title: string | null;
  paper_style: PaperStyle;
  content: Json;
  drawing: Json;
  show_guides: boolean;
  rounded: boolean;
  shadow: boolean;
  bookmarked: boolean;
};

export function pageFromRow(row: NotebookPage): PageState {
  return {
    id: row.id,
    title: row.title,
    paper_style: isPaperStyle(row.paper_style) ? row.paper_style : DEFAULT_PAPER,
    content: row.content,
    drawing: row.drawing,
    show_guides: row.show_guides,
    rounded: row.rounded,
    shadow: row.shadow,
    bookmarked: row.bookmarked,
  };
}
