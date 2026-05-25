"use server";

import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json, UpdateDto } from "@/lib/supabase/types";
import { isNotebookTheme, isPaperStyle } from "@/types/notebook";

import type { NotebookPage } from "./queries";

const uuid = z.string().uuid();

/** Append a fresh blank page to the end of a notebook. */
export async function addPage(notebookId: string): Promise<NotebookPage> {
  const id = uuid.parse(notebookId);
  const supabase = await createSupabaseServerClient();

  const { data: last } = await supabase
    .from("notebook_pages")
    .select("position")
    .eq("notebook_id", id)
    .order("position", { ascending: false })
    .limit(1);
  const nextPosition = (last?.[0]?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("notebook_pages")
    .insert({ notebook_id: id, position: nextPosition })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Copy a page's content + styling onto a new page appended at the end. */
export async function duplicatePage(pageId: string): Promise<NotebookPage> {
  const id = uuid.parse(pageId);
  const supabase = await createSupabaseServerClient();

  const { data: src, error: srcErr } = await supabase
    .from("notebook_pages")
    .select("*")
    .eq("id", id)
    .single();
  if (srcErr) throw new Error(srcErr.message);

  const { data: last } = await supabase
    .from("notebook_pages")
    .select("position")
    .eq("notebook_id", src.notebook_id)
    .order("position", { ascending: false })
    .limit(1);
  const nextPosition = (last?.[0]?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("notebook_pages")
    .insert({
      notebook_id: src.notebook_id,
      position: nextPosition,
      title: src.title,
      paper_style: src.paper_style,
      content: src.content,
      show_guides: src.show_guides,
      rounded: src.rounded,
      shadow: src.shadow,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Autosave: persist a page's rich-text document. */
export async function updatePageContent(
  pageId: string,
  content: Json,
): Promise<void> {
  const id = uuid.parse(pageId);
  if (JSON.stringify(content).length > 1_000_000) {
    throw new Error("Page content is too large.");
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("notebook_pages")
    .update({ content })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

const StylePatch = z.object({
  paperStyle: z.string().refine(isPaperStyle, "Unknown paper style").optional(),
  showGuides: z.boolean().optional(),
  rounded: z.boolean().optional(),
  shadow: z.boolean().optional(),
  bookmarked: z.boolean().optional(),
  title: z.string().trim().max(120).nullable().optional(),
});

/** Update a single page's appearance / metadata. */
export async function updatePageStyle(
  pageId: string,
  patch: z.input<typeof StylePatch>,
): Promise<void> {
  const id = uuid.parse(pageId);
  const parsed = StylePatch.parse(patch);

  const update: UpdateDto<"notebook_pages"> = {};
  if (parsed.paperStyle !== undefined) update.paper_style = parsed.paperStyle;
  if (parsed.showGuides !== undefined) update.show_guides = parsed.showGuides;
  if (parsed.rounded !== undefined) update.rounded = parsed.rounded;
  if (parsed.shadow !== undefined) update.shadow = parsed.shadow;
  if (parsed.bookmarked !== undefined) update.bookmarked = parsed.bookmarked;
  if (parsed.title !== undefined) update.title = parsed.title;
  if (Object.keys(update).length === 0) return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("notebook_pages")
    .update(update)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Delete a page. Refuses to remove the last page so a notebook always has
 * something to show.
 */
export async function deletePage(
  pageId: string,
  notebookId: string,
): Promise<{ ok: boolean; message?: string }> {
  const id = uuid.parse(pageId);
  const nb = uuid.parse(notebookId);
  const supabase = await createSupabaseServerClient();

  const { count } = await supabase
    .from("notebook_pages")
    .select("id", { count: "exact", head: true })
    .eq("notebook_id", nb);
  if ((count ?? 0) <= 1) {
    return { ok: false, message: "A notebook needs at least one page." };
  }

  const { error } = await supabase
    .from("notebook_pages")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Persist a new page order. `orderedIds` is the full list in its new order. */
export async function reorderPages(
  notebookId: string,
  orderedIds: string[],
): Promise<void> {
  uuid.parse(notebookId);
  const ids = z.array(uuid).min(1).parse(orderedIds);
  const supabase = await createSupabaseServerClient();

  await Promise.all(
    ids.map((id, index) =>
      supabase
        .from("notebook_pages")
        .update({ position: index })
        .eq("id", id)
        .eq("notebook_id", notebookId),
    ),
  );
}

const NotebookPatch = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  theme: z.string().refine(isNotebookTheme, "Unknown theme").optional(),
});

/** Update notebook-wide settings (title, theme). */
export async function updateNotebook(
  notebookId: string,
  patch: z.input<typeof NotebookPatch>,
): Promise<void> {
  const id = uuid.parse(notebookId);
  const parsed = NotebookPatch.parse(patch);
  if (Object.keys(parsed).length === 0) return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("notebooks")
    .update(parsed)
    .eq("id", id);
  if (error) throw new Error(error.message);
}
