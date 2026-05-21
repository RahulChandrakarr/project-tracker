import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type ProjectCategory = Tables<"project_categories">;

export type CategoryWithCount = ProjectCategory & { projectCount: number };

export async function listCategories(): Promise<ProjectCategory[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Categories plus how many projects use each. The caller is app-admin (the
 * categories page), so RLS returns every project for the count.
 */
export async function listCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const supabase = await createSupabaseServerClient();

  const [categoriesRes, projectsRes] = await Promise.all([
    supabase
      .from("project_categories")
      .select("*")
      .order("name", { ascending: true }),
    supabase.from("projects").select("category_id"),
  ]);

  if (categoriesRes.error) throw new Error(categoriesRes.error.message);
  if (projectsRes.error) throw new Error(projectsRes.error.message);

  const counts = new Map<string, number>();
  for (const p of projectsRes.data ?? []) {
    if (p.category_id) {
      counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1);
    }
  }

  return (categoriesRes.data ?? []).map((c) => ({
    ...c,
    projectCount: counts.get(c.id) ?? 0,
  }));
}
