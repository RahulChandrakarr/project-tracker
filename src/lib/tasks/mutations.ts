"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const CreateTaskInput = z.object({
  projectId: z.string().uuid(),
  parentId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(4000).optional(),
  assigneeId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  status: z.enum(["todo", "in_progress", "done"]).default("todo"),
  effort: z
    .enum(["quick", "medium", "large"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  dueDate: z
    .string()
    .trim()
    .min(1)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

const UpdateStatusInput = z.object({
  taskId: z.string().uuid(),
  projectId: z.string().uuid(),
  status: z.enum(["todo", "in_progress", "done"]),
});

const UpdateAssigneeInput = z.object({
  taskId: z.string().uuid(),
  projectId: z.string().uuid(),
  assigneeId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

const UpdateEffortInput = z.object({
  taskId: z.string().uuid(),
  projectId: z.string().uuid(),
  effort: z
    .enum(["quick", "medium", "large"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

const UpdateNotesInput = z.object({
  taskId: z.string().uuid(),
  projectId: z.string().uuid(),
  description: z.string().trim().max(4000),
});

const DeleteTaskInput = z.object({
  taskId: z.string().uuid(),
  projectId: z.string().uuid(),
});

const ReorderTasksInput = z.object({
  projectId: z.string().uuid(),
  orderedIds: z.array(z.string().uuid()).min(1),
});

export type TaskFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function createTask(
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const parsed = CreateTaskInput.safeParse(Object.fromEntries(formData));

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

  // Append to the end of the sibling group so new tasks land at the bottom of
  // their level (the done-at-bottom view rule still applies on top of this).
  const lastQuery = supabase
    .from("tasks")
    .select("position")
    .eq("project_id", parsed.data.projectId)
    .order("position", { ascending: false })
    .limit(1);
  const { data: last } = await (parsed.data.parentId
    ? lastQuery.eq("parent_id", parsed.data.parentId)
    : lastQuery.is("parent_id", null));
  const nextPosition = (last?.[0]?.position ?? -1) + 1;

  const { error } = await supabase.from("tasks").insert({
    project_id: parsed.data.projectId,
    parent_id: parsed.data.parentId ?? null,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    assignee_id: parsed.data.assigneeId ?? null,
    status: parsed.data.status,
    effort: parsed.data.effort ?? null,
    due_date: parsed.data.dueDate ?? null,
    completed_at: parsed.data.status === "done" ? new Date().toISOString() : null,
    position: nextPosition,
    created_by: user.id,
  });

  if (error) return { ok: false, message: error.message };

  // Adding a task changes the project's derived progress, so refresh the lists.
  revalidatePath(`/projects/${parsed.data.projectId}`);
  revalidatePath("/");
  revalidatePath("/projects");
  return { ok: true };
}

export async function updateTaskStatus(formData: FormData): Promise<void> {
  const parsed = UpdateStatusInput.parse(Object.fromEntries(formData));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      status: parsed.status,
      // Stamp completion time when a task is marked done; clear it if it
      // moves back out of done. Drives the per-member weekly report.
      completed_at: parsed.status === "done" ? new Date().toISOString() : null,
    })
    .eq("id", parsed.taskId);
  if (error) throw new Error(error.message);
  // Status drives the project's derived progress; refresh the lists too.
  revalidatePath(`/projects/${parsed.projectId}`);
  revalidatePath("/");
  revalidatePath("/projects");
  // Status feeds the per-member report + task tables on every profile page.
  revalidatePath("/members/[id]", "page");
}

export async function updateTaskAssignee(formData: FormData): Promise<void> {
  const parsed = UpdateAssigneeInput.parse(Object.fromEntries(formData));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tasks")
    .update({ assignee_id: parsed.assigneeId ?? null })
    .eq("id", parsed.taskId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${parsed.projectId}`);
}

export async function updateTaskEffort(formData: FormData): Promise<void> {
  const parsed = UpdateEffortInput.parse(Object.fromEntries(formData));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tasks")
    .update({ effort: parsed.effort ?? null })
    .eq("id", parsed.taskId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${parsed.projectId}`);
  // Effort feeds the per-member profile breakdown.
  revalidatePath("/members/[id]", "page");
}

export async function updateTaskNotes(formData: FormData): Promise<void> {
  const parsed = UpdateNotesInput.parse(Object.fromEntries(formData));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tasks")
    .update({ description: parsed.description || null })
    .eq("id", parsed.taskId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${parsed.projectId}`);
}

export async function deleteTask(formData: FormData): Promise<void> {
  const parsed = DeleteTaskInput.parse(Object.fromEntries(formData));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("tasks").delete().eq("id", parsed.taskId);
  if (error) throw new Error(error.message);
  // Removing a task changes the project's derived progress.
  revalidatePath(`/projects/${parsed.projectId}`);
  revalidatePath("/");
  revalidatePath("/projects");
}

/**
 * Persists a new order for a group of sibling tasks. `orderedIds` is the full
 * sibling group in its new order; `reorder_tasks` writes position = index.
 * Called directly (not via a form) from the drag-and-drop client component.
 */
export async function reorderTasks(input: {
  projectId: string;
  orderedIds: string[];
}): Promise<void> {
  const parsed = ReorderTasksInput.parse(input);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("reorder_tasks", {
    p_ids: parsed.orderedIds,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${parsed.projectId}`);
}
