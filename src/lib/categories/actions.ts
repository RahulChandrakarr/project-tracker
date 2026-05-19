"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertAppAdmin } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const CreateInput = z.object({
  name: z.string().trim().min(1).max(100),
});

const DeleteInput = z.object({
  id: z.string().uuid(),
});

export async function createCategory(formData: FormData): Promise<void> {
  const me = await assertAppAdmin();
  const parsed = CreateInput.parse(Object.fromEntries(formData));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("project_categories").insert({
    name: parsed.name,
    created_by: me.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/projects");
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await assertAppAdmin();
  const parsed = DeleteInput.parse(Object.fromEntries(formData));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("project_categories")
    .delete()
    .eq("id", parsed.id);
  if (error) throw new Error(error.message);
  revalidatePath("/projects");
}
