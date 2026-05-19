"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const AddLinkInput = z.object({
  projectId: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required").max(200),
  url: z
    .string()
    .trim()
    .url("Enter a valid URL (include https://)"),
});

const UploadFileInput = z.object({
  projectId: z.string().uuid(),
  // `file` is a Blob/File pulled from FormData separately.
});

const DeleteDocumentInput = z.object({
  documentId: z.string().uuid(),
  projectId: z.string().uuid(),
});

export type DocumentFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function addLink(
  _prev: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const parsed = AddLinkInput.safeParse({
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    url: formData.get("url"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_";
      fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Check the fields below.", fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  const { error } = await supabase.from("project_documents").insert({
    project_id: parsed.data.projectId,
    kind: "link",
    name: parsed.data.name,
    url: parsed.data.url,
    created_by: user.id,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/projects/${parsed.data.projectId}`);
  return { ok: true };
}

export async function uploadFile(
  _prev: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const projectId = formData.get("projectId");
  const file = formData.get("file");

  const parsed = UploadFileInput.safeParse({ projectId });
  if (!parsed.success) {
    return { ok: false, message: "Invalid project." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Pick a file to upload." };
  }
  if (file.size > 50 * 1024 * 1024) {
    return { ok: false, message: "File must be 50MB or smaller." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${parsed.data.projectId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("project-documents")
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) return { ok: false, message: uploadError.message };

  const { error: insertError } = await supabase
    .from("project_documents")
    .insert({
      project_id: parsed.data.projectId,
      kind: "file",
      name: file.name,
      url: storagePath, // populated for required NOT NULL — real URL is signed on demand
      storage_path: storagePath,
      size_bytes: file.size,
      mime_type: file.type || null,
      created_by: user.id,
    });

  if (insertError) {
    // Roll back the upload so we don't orphan a file.
    await supabase.storage
      .from("project-documents")
      .remove([storagePath])
      .catch(() => undefined);
    return { ok: false, message: insertError.message };
  }

  revalidatePath(`/projects/${parsed.data.projectId}`);
  return { ok: true };
}

export async function deleteDocument(formData: FormData): Promise<void> {
  const parsed = DeleteDocumentInput.parse(Object.fromEntries(formData));

  const supabase = await createSupabaseServerClient();

  const { data: doc, error: readError } = await supabase
    .from("project_documents")
    .select("storage_path")
    .eq("id", parsed.documentId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);

  const { error: deleteError } = await supabase
    .from("project_documents")
    .delete()
    .eq("id", parsed.documentId);

  if (deleteError) throw new Error(deleteError.message);

  // Best-effort delete of the storage object. If it fails, the DB row is
  // gone and the file is orphaned — acceptable; storage cleanup can be a
  // batch job.
  if (doc?.storage_path) {
    await supabase.storage
      .from("project-documents")
      .remove([doc.storage_path])
      .catch(() => undefined);
  }

  revalidatePath(`/projects/${parsed.projectId}`);
}
