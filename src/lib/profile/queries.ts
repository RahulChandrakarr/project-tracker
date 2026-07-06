import "server-only";

import { getCurrentUser, type CurrentUser } from "@/lib/auth/current-user";
import { toDateKey } from "@/lib/calendar/dates";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AppRole, TaskPriority, TaskStatus } from "@/lib/supabase/types";
import type { DashboardTask, TaskRow } from "@/lib/tasks/queries";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

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
  notionEmbedUrl: string | null;
  createdAt: string;
  lastSignInAt: string | null;
};

export type ProductivityBucket = {
  key: string;
  label: string;
  completed: number;
  created: number;
};

export type ProductivitySeries = {
  daily: ProductivityBucket[];
  weekly: ProductivityBucket[];
  monthly: ProductivityBucket[];
};

export type MemberReportTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority | null;
  dueDate: string | null;
  completedAt: string | null;
  projectId: string;
  projectName: string | null;
};

/** How a member's assigned tasks split by priority. */
export type PriorityBreakdown = {
  low: number;
  medium: number;
  high: number;
  /** Tasks with no priority set. */
  unset: number;
};

/** Work-calendar activity: tasks the member logged against days. */
export type CalendarActivity = {
  /** Distinct days with at least one logged task. */
  daysLogged: number;
  /** Total logged day tasks. */
  tasksLogged: number;
  done: number;
  inProgress: number;
  todo: number;
  loggedThisWeek: number;
  loggedThisMonth: number;
};

export type MemberReport = {
  totalAssigned: number;
  completed: number;
  inProgress: number;
  todo: number;
  overdue: number;
  completionRate: number;
  /** Distinct projects the member has assigned tasks in. */
  projectCount: number;
  /** Projects the member belongs to (project_members rows). */
  projectsInvolved: number;
  completedThisWeek: number;
  completedThisMonth: number;
  /** Mean days from task creation to completion; null if nothing done yet. */
  avgCompletionDays: number | null;
  /** % of completed tasks finished on/before their due date; null if none had a due date. */
  onTimeRate: number | null;
  /** Assigned tasks grouped by their optional priority. */
  priority: PriorityBreakdown;
  /** Work-calendar logging activity. */
  calendar: CalendarActivity;
  series: ProductivitySeries;
  recentTasks: MemberReportTask[];
};

const DAYS_TRACKED = 14;
const WEEKS_TRACKED = 8;
const MONTHS_TRACKED = 6;

type Period = { key: string; label: string; start: Date; end: Date };

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
    notionEmbedUrl: profile?.notion_embed_url ?? null,
    createdAt: authData.user.created_at ?? "",
    lastSignInAt: authData.user.last_sign_in_at ?? null,
  };
}

export async function getMemberReport(userId: string): Promise<MemberReport> {
  await assertCanViewMember(userId);

  const admin = createSupabaseAdminClient();

  const [tasksResult, membershipResult, calendarResult] = await Promise.all([
    admin
      .from("tasks")
      .select(
        "id, title, status, priority, due_date, completed_at, created_at, project_id",
      )
      .eq("assignee_id", userId),
    admin.from("project_members").select("project_id").eq("user_id", userId),
    admin
      .from("daily_task_entries")
      .select("entry_date, status")
      .eq("user_id", userId),
  ]);
  if (tasksResult.error) throw new Error(tasksResult.error.message);
  if (calendarResult.error) throw new Error(calendarResult.error.message);

  const rows = tasksResult.data ?? [];
  const projectsInvolved = new Set(
    (membershipResult.data ?? []).map((m) => m.project_id),
  ).size;

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
  const weekStart = startOfWeek(new Date());
  const monthStart = startOfMonth(new Date());

  let completed = 0;
  let inProgress = 0;
  let todo = 0;
  let overdue = 0;
  let completedThisWeek = 0;
  let completedThisMonth = 0;
  let completionDaysSum = 0;
  let completionDaysCount = 0;
  let onTimeCount = 0;
  let dueDatedCompleted = 0;
  const priority: PriorityBreakdown = { low: 0, medium: 0, high: 0, unset: 0 };
  for (const t of rows) {
    if (t.status === "done") completed += 1;
    else if (t.status === "in_progress") inProgress += 1;
    else todo += 1;

    if (t.priority === "low" || t.priority === "medium" || t.priority === "high") {
      priority[t.priority] += 1;
    } else {
      priority.unset += 1;
    }

    if (
      t.status !== "done" &&
      t.due_date &&
      new Date(t.due_date) < todayMidnight
    ) {
      overdue += 1;
    }

    if (t.completed_at) {
      const done = new Date(t.completed_at);
      if (done >= weekStart) completedThisWeek += 1;
      if (done >= monthStart) completedThisMonth += 1;

      if (t.created_at) {
        const days =
          (done.getTime() - new Date(t.created_at).getTime()) / 86_400_000;
        if (days >= 0) {
          completionDaysSum += days;
          completionDaysCount += 1;
        }
      }

      if (t.due_date) {
        dueDatedCompleted += 1;
        // On time if completed any time on or before the end of the due day.
        const dueEnd = new Date(t.due_date);
        dueEnd.setHours(23, 59, 59, 999);
        if (done <= dueEnd) onTimeCount += 1;
      }
    }
  }

  const totalAssigned = rows.length;
  const completionRate =
    totalAssigned === 0 ? 0 : Math.round((completed / totalAssigned) * 100);
  const avgCompletionDays =
    completionDaysCount === 0
      ? null
      : Math.round((completionDaysSum / completionDaysCount) * 10) / 10;
  const onTimeRate =
    dueDatedCompleted === 0
      ? null
      : Math.round((onTimeCount / dueDatedCompleted) * 100);

  // ----- work-calendar logging activity -----
  const weekStartKey = toDateKey(weekStart);
  const monthStartKey = toDateKey(monthStart);
  const calendarRows = calendarResult.data ?? [];
  const loggedDays = new Set<string>();
  const calendar: CalendarActivity = {
    daysLogged: 0,
    tasksLogged: calendarRows.length,
    done: 0,
    inProgress: 0,
    todo: 0,
    loggedThisWeek: 0,
    loggedThisMonth: 0,
  };
  for (const e of calendarRows) {
    loggedDays.add(e.entry_date);
    if (e.status === "done") calendar.done += 1;
    else if (e.status === "in_progress") calendar.inProgress += 1;
    else calendar.todo += 1;
    // entry_date is a plain YYYY-MM-DD key, so lexical compare works.
    if (e.entry_date >= weekStartKey) calendar.loggedThisWeek += 1;
    if (e.entry_date >= monthStartKey) calendar.loggedThisMonth += 1;
  }
  calendar.daysLogged = loggedDays.size;

  // ----- productivity buckets at three granularities (oldest first) -----
  const series: ProductivitySeries = {
    daily: fillBuckets(rows, dailyPeriods()),
    weekly: fillBuckets(rows, weeklyPeriods()),
    monthly: fillBuckets(rows, monthlyPeriods()),
  };

  // ----- recent tasks (most recently touched first) -----
  const recentTasks: MemberReportTask[] = [...rows]
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, 15)
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
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
    projectsInvolved,
    completedThisWeek,
    completedThisMonth,
    avgCompletionDays,
    onTimeRate,
    priority,
    calendar,
    series,
    recentTasks,
  };
}

/**
 * Open (not-done) tasks assigned to a member, soonest deadline first. Uses the
 * admin client (RLS-bypassing) behind `assertCanViewMember` so an app admin
 * can see another member's tasks across every project, matching getMemberReport.
 */
export async function getMemberOpenTasks(
  userId: string,
  limit = 8,
): Promise<DashboardTask[]> {
  await assertCanViewMember(userId);
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("tasks")
    .select("*")
    .eq("assignee_id", userId)
    .neq("status", "done")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);

  return attachProjectNames(admin, data ?? []);
}

/** Tasks assigned to a member and marked done, most recently completed first. */
export async function getMemberCompletedTasks(
  userId: string,
  limit = 8,
): Promise<DashboardTask[]> {
  await assertCanViewMember(userId);
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("tasks")
    .select("*")
    .eq("assignee_id", userId)
    .eq("status", "done")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  return attachProjectNames(admin, data ?? []);
}

/** Pairs each task with its project's id + name in one round trip. */
async function attachProjectNames(
  admin: AdminClient,
  rows: TaskRow[],
): Promise<DashboardTask[]> {
  if (rows.length === 0) return [];

  const projectIds = Array.from(new Set(rows.map((t) => t.project_id)));
  const { data: projects } = await admin
    .from("projects")
    .select("id, name")
    .in("id", projectIds);
  const nameById = new Map(projects?.map((p) => [p.id, p.name]) ?? []);

  return rows.map((t) => ({
    ...t,
    project: nameById.has(t.project_id)
      ? { id: t.project_id, name: nameById.get(t.project_id)! }
      : null,
  }));
}

/** Count completed/created tasks falling inside each period window. */
function fillBuckets(
  rows: { completed_at: string | null; created_at: string }[],
  periods: Period[],
): ProductivityBucket[] {
  return periods.map((p) => {
    let bucketCompleted = 0;
    let bucketCreated = 0;
    for (const t of rows) {
      if (t.completed_at) {
        const c = new Date(t.completed_at);
        if (c >= p.start && c < p.end) bucketCompleted += 1;
      }
      if (t.created_at) {
        const cr = new Date(t.created_at);
        if (cr >= p.start && cr < p.end) bucketCreated += 1;
      }
    }
    return {
      key: p.key,
      label: p.label,
      completed: bucketCompleted,
      created: bucketCreated,
    };
  });
}

function dailyPeriods(): Period[] {
  const today = startOfDay(new Date());
  const periods: Period[] = [];
  for (let i = DAYS_TRACKED - 1; i >= 0; i--) {
    const start = addDays(today, -i);
    const end = addDays(start, 1);
    periods.push({
      key: start.toISOString(),
      label: start.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      }),
      start,
      end,
    });
  }
  return periods;
}

function weeklyPeriods(): Period[] {
  const thisWeek = startOfWeek(new Date());
  const periods: Period[] = [];
  for (let i = WEEKS_TRACKED - 1; i >= 0; i--) {
    const start = addDays(thisWeek, -7 * i);
    const end = addDays(start, 7);
    periods.push({
      key: start.toISOString(),
      label: start.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      }),
      start,
      end,
    });
  }
  return periods;
}

function monthlyPeriods(): Period[] {
  const thisMonth = startOfMonth(new Date());
  const periods: Period[] = [];
  for (let i = MONTHS_TRACKED - 1; i >= 0; i--) {
    const start = addMonths(thisMonth, -i);
    const end = addMonths(start, 1);
    periods.push({
      key: start.toISOString(),
      label: start.toLocaleDateString("en-GB", { month: "short" }),
      start,
      end,
    });
  }
  return periods;
}

function startOfDay(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfWeek(d: Date): Date {
  const date = startOfDay(d);
  const day = date.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  date.setDate(date.getDate() + diff);
  return date;
}

function startOfMonth(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(1);
  return date;
}

function addDays(d: Date, days: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + days);
  return date;
}

function addMonths(d: Date, months: number): Date {
  const date = new Date(d);
  date.setMonth(date.getMonth() + months);
  return date;
}
