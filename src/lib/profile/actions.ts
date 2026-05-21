"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "_";
      fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Check the fields below.", fieldErrors };
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
