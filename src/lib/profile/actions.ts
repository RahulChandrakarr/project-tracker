"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProfileFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

const DetailsInput = z.object({
  userId: z.string().uuid(),
  fullName: z.string().trim().min(1, "Name is required").max(100),
  title: optionalText(120),
  phone: optionalText(40),
  location: optionalText(120),
  bio: optionalText(2000),
});

const PasswordInput = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function flattenErrors(issues: z.ZodIssue[]): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0]?.toString() ?? "_";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/** Anyone can edit their own profile; app admins can edit anyone's. */
async function canEditProfile(userId: string): Promise<boolean> {
  const me = await getCurrentUser();
  return me.id === userId || me.role === "admin";
}

export async function updateProfileDetails(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const parsed = DetailsInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the fields below.",
      fieldErrors: flattenErrors(parsed.error.issues),
    };
  }

  if (!(await canEditProfile(parsed.data.userId))) {
    return { ok: false, message: "You can only edit your own profile." };
  }

  const admin = createSupabaseAdminClient();
  // Note: role is intentionally never written here. Roles change only via
  // the admin-only updateUserRole action.
  const { error } = await admin
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      title: parsed.data.title ?? null,
      phone: parsed.data.phone ?? null,
      location: parsed.data.location ?? null,
      bio: parsed.data.bio ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.userId);

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/members/${parsed.data.userId}`);
  revalidatePath("/members");
  return { ok: true, message: "Profile updated." };
}

/** Accepts published Notion pages and Notion Calendar links only. */
function isNotionEmbedUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return (
    host === "notion.so" ||
    host.endsWith(".notion.so") ||
    host === "notion.site" ||
    host.endsWith(".notion.site") ||
    host === "notion.com" ||
    host.endsWith(".notion.com")
  );
}

/**
 * Saves (or clears, when blank) the signed-in user's Notion embed link. Self
 * only — a personal link, so admins don't set it for others.
 */
export async function updateNotionEmbed(
  url: string,
): Promise<ProfileFormState> {
  const me = await getCurrentUser();
  const trimmed = (url ?? "").trim();

  if (trimmed !== "" && !isNotionEmbedUrl(trimmed)) {
    return {
      ok: false,
      message: "Enter a valid Notion link (notion.so or notion.site).",
    };
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      notion_embed_url: trimmed === "" ? null : trimmed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", me.id);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/members/${me.id}`);
  return {
    ok: true,
    message: trimmed === "" ? "Notion link removed." : "Notion link saved.",
  };
}

export async function updateMyPassword(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const parsed = PasswordInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the fields below.",
      fieldErrors: flattenErrors(parsed.error.issues),
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, message: "Sign in again before changing password." };
  }

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (authError) {
    return {
      ok: false,
      fieldErrors: { currentPassword: "Current password is incorrect" },
      message: "Check the fields below.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/members/${user.id}`);
  return { ok: true, message: "Password changed." };
}

export async function updateAvatar(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const userId = formData.get("userId");
  const file = formData.get("file");

  if (typeof userId !== "string" || !z.string().uuid().safeParse(userId).success) {
    return { ok: false, message: "Invalid user." };
  }
  if (!(await canEditProfile(userId))) {
    return { ok: false, message: "You can only change your own photo." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Pick an image to upload." };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, message: "That file isn't an image." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, message: "Image must be 5MB or smaller." };
  }

  const admin = createSupabaseAdminClient();
  const ext = (file.name.split(".").pop() ?? "png")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const path = `${userId}/${crypto.randomUUID()}.${ext || "png"}`;

  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(path, file, {
      contentType: file.type,
      upsert: true,
    });
  if (uploadError) return { ok: false, message: uploadError.message };

  const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);

  const { error } = await admin
    .from("profiles")
    .update({ avatar_url: pub.publicUrl, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/members/${userId}`);
  revalidatePath("/members");
  return { ok: true, message: "Photo updated." };
}
