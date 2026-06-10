import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type ProjectDocument = Tables<"project_documents">;

export async function listProjectDocuments(
  projectId: string,
): Promise<ProjectDocument[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_documents")
    .select("*")
    // Project-level documents only; task attachments (task_id set) render on
    // their own task via `listTaskAttachments`.
    .eq("project_id", projectId)
    .is("task_id", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Every file attached to a task in this project, grouped by task id. The task
 * tree passes the matching list down to each task row, mirroring how notes are
 * threaded through `notesByTaskId`.
 */
export async function listTaskAttachments(
  projectId: string,
): Promise<Map<string, ProjectDocument[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_documents")
    .select("*")
    .eq("project_id", projectId)
    .not("task_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const byTaskId = new Map<string, ProjectDocument[]>();
  for (const doc of data ?? []) {
    if (!doc.task_id) continue;
    const list = byTaskId.get(doc.task_id) ?? [];
    list.push(doc);
    byTaskId.set(doc.task_id, list);
  }
  return byTaskId;
}

/**
 * Returns a short-lived signed URL for a stored file. Storage bucket is
 * private, so we never expose the storage_path directly — only signed URLs
 * generated on demand. The link is good for 60 seconds.
 */
export async function getSignedDocumentUrl(
  storagePath: string,
): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from("project-documents")
    .createSignedUrl(storagePath, 60);
  if (error) return null;
  return data.signedUrl;
}
