import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type Notebook = Tables<"notebooks">;
export type NotebookPage = Tables<"notebook_pages">;

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Loads the signed-in user's notebook and its pages, creating a fresh notebook
 * (with one blank page) on first visit. Everything runs through the RLS-scoped
 * client, so a user only ever touches their own rows — admins included.
 */
export async function getOrCreateMyNotebook(): Promise<{
  notebook: Notebook;
  pages: NotebookPage[];
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing, error: readErr } = await supabase
    .from("notebooks")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);

  let notebook = existing;
  if (!notebook) {
    const { data: created, error } = await supabase
      .from("notebooks")
      .insert({ owner_id: user.id })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    notebook = created;
  }

  let pages = await fetchPages(supabase, notebook.id);
  if (pages.length === 0) {
    const { error } = await supabase
      .from("notebook_pages")
      .insert({ notebook_id: notebook.id, position: 0 });
    if (error) throw new Error(error.message);
    pages = await fetchPages(supabase, notebook.id);
  }

  return { notebook, pages };
}

async function fetchPages(
  supabase: ServerClient,
  notebookId: string,
): Promise<NotebookPage[]> {
  const { data, error } = await supabase
    .from("notebook_pages")
    .select("*")
    .eq("notebook_id", notebookId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}
