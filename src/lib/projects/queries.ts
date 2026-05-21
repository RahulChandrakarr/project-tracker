import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type Project = Tables<"projects">;

/**
 * Filter predicate for the `?category=` param: "" (or undefined) = all,
 * "none" = uncategorised, otherwise match the category id.
 */
export function matchesCategory(
  project: Pick<Project, "category_id">,
  filter: string | undefined,
): boolean {
  if (!filter) return true;
  if (filter === "none") return project.category_id === null;
  return project.category_id === filter;
}

export async function listProjects(): Promise<Project[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load projects: ${error.message}`);
  }

  return data ?? [];
}

export async function getProjectById(id: string): Promise<Project | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load project ${id}: ${error.message}`);
  }

  return data;
}
