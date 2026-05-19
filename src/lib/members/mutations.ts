"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const AddMemberInput = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["admin", "member"]).default("member"),
});

const UpdateRoleInput = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["admin", "member"]),
});

const RemoveMemberInput = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
});

export type MemberFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function addMember(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const parsed = AddMemberInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("project_members").insert({
    project_id: parsed.data.projectId,
    user_id: parsed.data.userId,
    role: parsed.data.role,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/projects/${parsed.data.projectId}`);
  return { ok: true };
}

export async function updateMemberRole(formData: FormData): Promise<void> {
  const parsed = UpdateRoleInput.parse(Object.fromEntries(formData));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("project_members")
    .update({ role: parsed.role })
    .eq("project_id", parsed.projectId)
    .eq("user_id", parsed.userId);

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${parsed.projectId}`);
}

export async function removeMember(formData: FormData): Promise<void> {
  const parsed = RemoveMemberInput.parse(Object.fromEntries(formData));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", parsed.projectId)
    .eq("user_id", parsed.userId);

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${parsed.projectId}`);
}
