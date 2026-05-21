import "server-only";

import { getCurrentUser, type CurrentUser } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AppRole, TaskStatus } from "@/lib/supabase/types";

export type MemberProfile = {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  title: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  role: AppRole;
  createdAt: string;
  lastSignInAt: string | null;
};

export type WeekBucket = {
  weekStart: string;
  label: string;
  completed: number;
  created: number;
};

export type MemberReportTask = {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: string | null;
  completedAt: string | null;
  projectId: string;
  projectName: string | null;
};

export type MemberReport = {
  totalAssigned: number;
  completed: number;
  inProgress: number;
  todo: number;
  overdue: number;
  completionRate: number;
  projectCount: number;
  completedThisWeek: number;
  completedLastWeek: number;
  growthRate: number | null;
  weeks: WeekBucket[];
  recentTasks: MemberReportTask[];
};

const WEEKS_TRACKED = 8;

/**
 * The member detail page is visible to app admins (any member) and to the
 * member themselves. Throws otherwise. Callers run inside the authed layout.
 */
export async function assertCanViewMember(
  userId: string,
): Promise<CurrentUser> {
  const me = await getCurrentUser();
  if (me.id !== userId && me.role !== "admin") {
    throw new Error("Forbidden: you can only view your own profile.");
  }
  return me;
}

export async function getMemberProfile(
  userId: string,
): Promise<MemberProfile | null> {
  await assertCanViewMember(userId);

  const admin = createSupabaseAdminClient();

  const { data: authData, error: authError } =
    await admin.auth.admin.getUserById(userId);
  if (authError || !authData.user) return null;

  const { data: profile, error } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  return {
    id: userId,
    email: authData.user.email ?? null,
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    title: profile?.title ?? null,
    phone: profile?.phone ?? null,
    location: profile?.location ?? null,
    bio: profile?.bio ?? null,
    role: (profile?.role ?? "member") as AppRole,
    createdAt: authData.user.created_at ?? "",
    lastSignInAt: authData.user.last_sign_in_at ?? null,
  };
}

export async function getMemberReport(userId: string): Promise<MemberReport> {
  await assertCanViewMember(userId);

  const admin = createSupabaseAdminClient();

  const { data: tasks, error } = await admin
    .from("tasks")
    .select("id, title, status, due_date, completed_at, created_at, project_id")
    .eq("assignee_id", userId);
  if (error) throw new Error(error.message);

  const rows = tasks ?? [];

  // Resolve project names in one round trip.
  const projectIds = Array.from(new Set(rows.map((t) => t.project_id)));
  let projectNameById = new Map<string, string>();
  if (projectIds.length > 0) {
    const { data: projects } = await admin
      .from("projects")
      .select("id, name")
      .in("id", projectIds);
    projectNameById = new Map(projects?.map((p) => [p.id, p.name]) ?? []);
  }

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  let completed = 0;
  let inProgress = 0;
  let todo = 0;
  let overdue = 0;
  for (const t of rows) {
    if (t.status === "done") completed += 1;
    else if (t.status === "in_progress") inProgress += 1;
    else todo += 1;

    if (
      t.status !== "done" &&
      t.due_date &&
      new Date(t.due_date) < todayMidnight
    ) {
      overdue += 1;
    }
  }

  const totalAssigned = rows.length;
  const completionRate =
    totalAssigned === 0 ? 0 : Math.round((completed / totalAssigned) * 100);

  // ----- weekly buckets (Monday-aligned, oldest first) -----
  const thisWeekStart = startOfWeek(new Date());
  const weeks: WeekBucket[] = [];
  for (let i = WEEKS_TRACKED - 1; i >= 0; i--) {
    const start = addDays(thisWeekStart, -7 * i);
    const end = addDays(start, 7);
    let weekCompleted = 0;
    let weekCreated = 0;
    for (const t of rows) {
      if (t.completed_at) {
        const c = new Date(t.completed_at);
        if (c >= start && c < end) weekCompleted += 1;
      }
      if (t.created_at) {
        const cr = new Date(t.created_at);
        if (cr >= start && cr < end) weekCreated += 1;
      }
    }
    weeks.push({
      weekStart: start.toISOString(),
      label: start.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      }),
      completed: weekCompleted,
      created: weekCreated,
    });
  }

  const completedThisWeek = weeks[weeks.length - 1]?.completed ?? 0;
  const completedLastWeek = weeks[weeks.length - 2]?.completed ?? 0;
  const growthRate =
    completedLastWeek === 0
      ? null
      : Math.round(
          ((completedThisWeek - completedLastWeek) / completedLastWeek) * 100,
        );

  // ----- recent tasks (most recently touched first) -----
  const recentTasks: MemberReportTask[] = [...rows]
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, 15)
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      dueDate: t.due_date,
      completedAt: t.completed_at,
      projectId: t.project_id,
      projectName: projectNameById.get(t.project_id) ?? null,
    }));

  return {
    totalAssigned,
    completed,
    inProgress,
    todo,
    overdue,
    completionRate,
    projectCount: projectIds.length,
    completedThisWeek,
    completedLastWeek,
    growthRate,
    weeks,
    recentTasks,
  };
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  date.setDate(date.getDate() + diff);
  return date;
}

function addDays(d: Date, days: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + days);
  return date;
}
