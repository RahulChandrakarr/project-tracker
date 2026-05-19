"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const AddNoteInput = z.object({
  projectId: z.string().uuid(),
  taskId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  body: z.string().trim().min(1, "Note is empty").max(4000),
});

const DeleteNoteInput = z.object({
  noteId: z.string().uuid(),
  projectId: z.string().uuid(),
});

export type NoteFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function addNote(
  _prev: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const parsed = AddNoteInput.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_";
      fieldErrors[key] = issue.message;
    }
    return { ok: false, message: parsed.error.issues[0]?.message, fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  const { error } = await supabase.from("notes").insert({
    project_id: parsed.data.projectId,
    task_id: parsed.data.taskId ?? null,
    body: parsed.data.body,
    created_by: user.id,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/projects/${parsed.data.projectId}`);
  return { ok: true };
}

export async function deleteNote(formData: FormData): Promise<void> {
  const parsed = DeleteNoteInput.parse(Object.fromEntries(formData));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", parsed.noteId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${parsed.projectId}`);
}
