import "server-only";

import { getCurrentUser, type CurrentUser } from "@/lib/auth/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Who may read another user's work calendar:
 * - The calendar owner (always)
 * - Workspace app admins (`profiles.role = 'admin'`)
 * - Project admins on at least one project the target also belongs to
 *
 * Regular project members / employees cannot view teammates' calendars.
 */
export async function canViewUserCalendar(
  viewerId: string,
  targetId: string,
): Promise<boolean> {
  if (viewerId === targetId) return true;

  const supabase = await createSupabaseServerClient();

  const { data: viewerProfile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", viewerId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (viewerProfile?.role === "admin") return true;

  const { data: adminProjects, error: adminError } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", viewerId)
    .eq("role", "admin");
  if (adminError) throw new Error(adminError.message);
  if (!adminProjects?.length) return false;

  const projectIds = adminProjects.map((row) => row.project_id);
  const { data: targetMembership, error: targetError } = await supabase
    .from("project_members")
    .select("user_id")
    .eq("user_id", targetId)
    .in("project_id", projectIds)
    .limit(1);
  if (targetError) throw new Error(targetError.message);

  return (targetMembership?.length ?? 0) > 0;
}

/**
 * Ensures the signed-in user may read the target user's work calendar.
 * Returns the current user when allowed.
 */
export async function assertCanViewUserCalendar(
  targetUserId: string,
): Promise<CurrentUser> {
  const me = await getCurrentUser();
  const allowed = await canViewUserCalendar(me.id, targetUserId);
  if (!allowed) {
    throw new Error("Forbidden: you cannot view this calendar.");
  }
  return me;
}

/** True when the caller may open other users' calendars in the UI picker. */
export async function canViewOthersCalendars(): Promise<boolean> {
  const me = await getCurrentUser();
  if (me.role === "admin") return true;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", me.id)
    .eq("role", "admin")
    .limit(1);
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

/** @deprecated Use canViewOthersCalendars */
export const canPickCalendarUsers = canViewOthersCalendars;
