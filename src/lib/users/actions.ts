"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertAppAdmin } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const CreateUserInput = z.object({
  email: z.string().trim().email("Enter a valid email"),
  fullName: z.string().trim().min(1, "Name is required").max(100),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  role: z.enum(["admin", "member"]).default("member"),
});

const InviteUserInput = z.object({
  email: z.string().trim().email("Enter a valid email"),
  fullName: z.string().trim().min(1, "Name is required").max(100),
  role: z.enum(["admin", "member"]).default("member"),
});

const UpdateRoleInput = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "member"]),
});

const DeleteUserInput = z.object({
  userId: z.string().uuid(),
});

export type UserFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function createUser(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  await assertAppAdmin();

  const parsed = CreateUserInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_";
      fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Check the fields below.", fieldErrors };
  }

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  // The on_auth_user_created trigger inserts a profile with the default role
  // ('member'). If the admin chose 'admin', update it.
  if (parsed.data.role === "admin") {
    const { error: roleError } = await admin
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", data.user.id);
    if (roleError) {
      return {
        ok: true,
        message:
          "User created, but failed to set admin role: " + roleError.message,
      };
    }
  }

  revalidatePath("/members");
  return { ok: true };
}

export async function inviteUser(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  await assertAppAdmin();

  const parsed = InviteUserInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_";
      fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Check the fields below.", fieldErrors };
  }

  // The redirectTo is where Supabase sends the user after they click the
  // email link. We need the absolute URL — assemble it from the public site
  // URL env var, falling back to the Supabase project URL minus the API path.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const redirectTo = `${siteUrl.replace(/\/$/, "")}/auth/callback?next=/auth/set-password`;

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: { full_name: parsed.data.fullName },
      redirectTo,
    },
  );

  if (error) return { ok: false, message: error.message };

  // The on_auth_user_created trigger fires for invited users too, so a
  // profile row exists by the time we get the response. Set the role.
  if (data.user && parsed.data.role === "admin") {
    const { error: roleError } = await admin
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", data.user.id);
    if (roleError) {
      return {
        ok: true,
        message:
          "Invite sent, but failed to set admin role: " + roleError.message,
      };
    }
  }

  revalidatePath("/members");
  return {
    ok: true,
    message: `Invite sent to ${parsed.data.email}. They'll get an email with a link to set their password.`,
  };
}

export async function updateUserRole(formData: FormData): Promise<void> {
  await assertAppAdmin();

  const parsed = UpdateRoleInput.parse(Object.fromEntries(formData));

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role: parsed.role })
    .eq("id", parsed.userId);

  if (error) throw new Error(error.message);
  revalidatePath("/members");
}

export async function deleteUser(formData: FormData): Promise<void> {
  const me = await assertAppAdmin();

  const parsed = DeleteUserInput.parse(Object.fromEntries(formData));

  if (parsed.userId === me.id) {
    throw new Error("You can't delete your own account from here.");
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(parsed.userId);
  if (error) throw new Error(error.message);

  // profile row + project_members + tasks.assignee_id cascade via FKs.
  revalidatePath("/members");
}
