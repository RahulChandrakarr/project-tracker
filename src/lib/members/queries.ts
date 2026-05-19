import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProjectMemberRole } from "@/lib/supabase/types";

export type ProjectMember = {
  userId: string;
  role: ProjectMemberRole;
  addedAt: string;
  fullName: string | null;
  email: string | null;
};

export type AssignableUser = {
  id: string;
  fullName: string | null;
  email: string | null;
};

/**
 * Members of a project, joined with profile data.
 * RLS already scopes this — only members of the project see rows.
 */
export async function listProjectMembers(
  projectId: string,
): Promise<ProjectMember[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("project_members")
    .select(
      "user_id, role, added_at, profiles!project_members_user_id_fkey(full_name)",
    )
    .eq("project_id", projectId);

  if (error) {
    // PostgREST may not resolve the FK alias if names differ from defaults —
    // fall back to a two-step fetch.
    return await listProjectMembersFallback(projectId);
  }

  type Joined = {
    user_id: string;
    role: ProjectMemberRole;
    added_at: string;
    profiles: { full_name: string | null } | null;
  };

  const rows = (data ?? []) as unknown as Joined[];

  return rows.map((r) => ({
    userId: r.user_id,
    role: r.role,
    addedAt: r.added_at,
    fullName: r.profiles?.full_name ?? null,
    email: null,
  }));
}

async function listProjectMembersFallback(
  projectId: string,
): Promise<ProjectMember[]> {
  const supabase = await createSupabaseServerClient();

  const { data: memberships, error } = await supabase
    .from("project_members")
    .select("user_id, role, added_at")
    .eq("project_id", projectId);

  if (error) throw new Error(error.message);
  if (!memberships?.length) return [];

  const ids = memberships.map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", ids);

  const byId = new Map(profiles?.map((p) => [p.id, p.full_name]) ?? []);

  return memberships.map((m) => ({
    userId: m.user_id,
    role: m.role,
    addedAt: m.added_at,
    fullName: byId.get(m.user_id) ?? null,
    email: null,
  }));
}

/**
 * Users who can be added to this project — every profile except those
 * already members of the project. RLS lets every authenticated user read
 * the basic profile columns.
 */
export async function listAssignableUsers(
  projectId: string,
): Promise<AssignableUser[]> {
  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("project_members")
    .select("user_id")
    .eq("project_id", projectId);

  const excluded = new Set(existing?.map((m) => m.user_id) ?? []);

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name", { ascending: true });

  if (error) throw new Error(error.message);

  return (profiles ?? [])
    .filter((p) => !excluded.has(p.id))
    .map((p) => ({ id: p.id, fullName: p.full_name, email: null }));
}
