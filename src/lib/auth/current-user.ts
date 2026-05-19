import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole, ProjectMemberRole } from "@/lib/supabase/types";

export type CurrentUser = {
  id: string;
  email: string | null;
  role: AppRole;
  fullName: string | null;
};

/**
 * Returns the authenticated user + their global role.
 * Throws if not signed in — callers should already be inside an authed layout.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load profile: ${error.message}`);
  }

  return {
    id: user.id,
    email: user.email ?? null,
    role: (profile?.role ?? "member") as AppRole,
    fullName: profile?.full_name ?? null,
  };
}

/**
 * Throws unless the caller is the global app-admin. Use at the top of any
 * Server Action that touches the service-role client.
 */
export async function assertAppAdmin(): Promise<CurrentUser> {
  const me = await getCurrentUser();
  if (me.role !== "admin") {
    throw new Error("Forbidden: app-admin role required");
  }
  return me;
}

/**
 * Per-project role lookup. Returns null if the user is not a member.
 * App admins are treated as project admins on every project.
 */
export async function getProjectRole(
  projectId: string,
): Promise<{ role: ProjectMemberRole; viaAppAdmin: boolean } | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "admin") {
    return { role: "admin", viaAppAdmin: true };
  }

  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return null;
  return { role: membership.role, viaAppAdmin: false };
}
