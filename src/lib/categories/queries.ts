import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type ProjectCategory = Tables<"project_categories">;

export async function listCategories(): Promise<ProjectCategory[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}
