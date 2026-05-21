"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const Credentials = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const SignupInput = Credentials.extend({
  fullName: z.string().trim().min(1, "Name is required").max(100).optional(),
});

export type AuthFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

function flattenErrors(
  issues: z.ZodIssue[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0]?.toString() ?? "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = Credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the fields below.",
      fieldErrors: flattenErrors(parsed.error.issues),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = SignupInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the fields below.",
      fieldErrors: flattenErrors(parsed.error.issues),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: parsed.data.fullName
        ? { full_name: parsed.data.fullName }
        : undefined,
    },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    message:
      "Check your email to confirm. Once confirmed, return here and sign in.",
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

const SetPasswordInput = z.object({
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

export async function setPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = SetPasswordInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message,
      fieldErrors: flattenErrors(parsed.error.issues),
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message:
        "Your invite link has expired. Ask your admin to send a fresh invite.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/");
}
