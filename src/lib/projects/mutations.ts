"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const ProjectInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  client: z.string().trim().min(1, "Client is required").max(200),
  status: z
    .enum(["planning", "in_progress", "blocked", "review", "done"])
    .default("planning"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  progress: z.coerce.number().int().min(0).max(100).default(0),
  deadline: z
    .string()
    .trim()
    .min(1)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  notes: z.string().trim().max(4000).optional(),
  categoryId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

const UpdateNotesInput = z.object({
  projectId: z.string().uuid(),
  notes: z.string().trim().max(4000),
});

const UpdateProgressInput = z.object({
  projectId: z.string().uuid(),
  progress: z.coerce.number().int().min(0).max(100),
});

const UpdateStatusInput = z.object({
  projectId: z.string().uuid(),
  status: z.enum(["planning", "in_progress", "blocked", "review", "done"]),
});

export type ProjectFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function createProject(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const parsed = ProjectInput.safeParse(Object.fromEntries(formData));

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

  if (!user) {
    return { ok: false, message: "You must be signed in." };
  }

  const { error } = await supabase.from("projects").insert({
    name: parsed.data.name,
    client: parsed.data.client,
    status: parsed.data.status,
    priority: parsed.data.priority,
    progress: parsed.data.progress,
    deadline: parsed.data.deadline ?? null,
    notes: parsed.data.notes ?? null,
    category_id: parsed.data.categoryId ?? null,
    owner_id: user.id,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/");
  revalidatePath("/projects");
  return { ok: true };
}

export async function updateProjectNotes(formData: FormData): Promise<void> {
  const parsed = UpdateNotesInput.parse(Object.fromEntries(formData));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("projects")
    .update({ notes: parsed.notes || null })
    .eq("id", parsed.projectId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${parsed.projectId}`);
}

export async function updateProjectProgress(formData: FormData): Promise<void> {
  const parsed = UpdateProgressInput.parse(Object.fromEntries(formData));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("projects")
    .update({ progress: parsed.progress })
    .eq("id", parsed.projectId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${parsed.projectId}`);
  revalidatePath("/");
  revalidatePath("/projects");
}

export async function updateProjectStatus(formData: FormData): Promise<void> {
  const parsed = UpdateStatusInput.parse(Object.fromEntries(formData));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("projects")
    .update({ status: parsed.status })
    .eq("id", parsed.projectId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${parsed.projectId}`);
  revalidatePath("/");
  revalidatePath("/projects");
}

export async function deleteProject(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/projects");
}
