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
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
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
