"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertAppAdmin } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const CreateInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});

const UpdateInput = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required").max(100),
});

const DeleteInput = z.object({
  id: z.string().uuid(),
});

export type CategoryFormState = {
  ok: boolean;
  message?: string;
};

// Postgres unique_violation — the category name column is `unique`.
const UNIQUE_VIOLATION = "23505";

export async function createCategory(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const me = await assertAppAdmin();

  const parsed = CreateInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("project_categories").insert({
    name: parsed.data.name,
    created_by: me.id,
  });

  if (error) {
    return {
      ok: false,
      message:
        error.code === UNIQUE_VIOLATION
          ? "A category with that name already exists."
          : error.message,
    };
  }

  revalidatePath("/categories");
  revalidatePath("/projects");
  return { ok: true };
}

export async function updateCategory(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await assertAppAdmin();

  const parsed = UpdateInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("project_categories")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.id);

  if (error) {
    return {
      ok: false,
      message:
        error.code === UNIQUE_VIOLATION
          ? "A category with that name already exists."
          : error.message,
    };
  }

  revalidatePath("/categories");
  revalidatePath("/projects");
  return { ok: true };
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await assertAppAdmin();
  const parsed = DeleteInput.parse(Object.fromEntries(formData));

  const supabase = await createSupabaseServerClient();
  // projects.category_id is ON DELETE SET NULL, so affected projects simply
  // become uncategorised — no cascade delete of projects.
  const { error } = await supabase
    .from("project_categories")
    .delete()
    .eq("id", parsed.id);
  if (error) throw new Error(error.message);

  revalidatePath("/categories");
  revalidatePath("/projects");
}
