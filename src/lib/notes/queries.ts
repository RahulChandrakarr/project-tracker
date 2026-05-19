import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type Note = Tables<"notes"> & {
  author: { id: string; fullName: string | null } | null;
};

/**
 * Returns every note for a project, joined with author profile.
 * Use `partitionNotes` to split into project-level and per-task buckets.
 */
export async function listProjectNotes(projectId: string): Promise<Note[]> {
  const supabase = await createSupabaseServerClient();

  const { data: notes, error } = await supabase
    .from("notes")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!notes?.length) return [];

  const authorIds = Array.from(
    new Set(
      notes
        .map((n) => n.created_by)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  let nameById = new Map<string, string | null>();
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", authorIds);
    nameById = new Map(profiles?.map((p) => [p.id, p.full_name]) ?? []);
  }

  return notes.map((n) => ({
    ...n,
    author: n.created_by
      ? { id: n.created_by, fullName: nameById.get(n.created_by) ?? null }
      : null,
  }));
}

/**
 * Splits a flat note list into:
 *   - project: notes with no task_id (general project notes)
 *   - byTaskId: Map<task_id, Note[]> for task-level notes
 */
export function partitionNotes(notes: Note[]): {
  project: Note[];
  byTaskId: Map<string, Note[]>;
} {
  const project: Note[] = [];
  const byTaskId = new Map<string, Note[]>();
  for (const n of notes) {
    if (n.task_id) {
      const bucket = byTaskId.get(n.task_id) ?? [];
      bucket.push(n);
      byTaskId.set(n.task_id, bucket);
    } else {
      project.push(n);
    }
  }
  return { project, byTaskId };
}
