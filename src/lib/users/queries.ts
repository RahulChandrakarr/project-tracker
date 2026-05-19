import "server-only";

import { assertAppAdmin } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AppRole } from "@/lib/supabase/types";

export type AppUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: AppRole;
  createdAt: string;
  lastSignInAt: string | null;
};

/**
 * Returns every user in the system. App-admin only.
 *
 * We use the admin client for two things:
 *   1. To read auth.users (emails, created_at, last_sign_in_at). Profiles
 *      don't store the email — it lives in auth.users.
 *   2. To get profile rows without RLS in the way (we already verified the
 *      caller is admin).
 */
export async function listAllUsers(): Promise<AppUser[]> {
  await assertAppAdmin();

  const admin = createSupabaseAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.listUsers(
    { page: 1, perPage: 200 },
  );
  if (authError) throw new Error(authError.message);

  const ids = authData.users.map((u) => u.id);

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, full_name, role")
    .in("id", ids);
  if (profilesError) throw new Error(profilesError.message);

  const profileById = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  return authData.users
    .map((u): AppUser => {
      const p = profileById.get(u.id);
      return {
        id: u.id,
        email: u.email ?? null,
        fullName: p?.full_name ?? null,
        role: p?.role ?? "member",
        createdAt: u.created_at ?? "",
        lastSignInAt: u.last_sign_in_at ?? null,
      };
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
