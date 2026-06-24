import "server-only";

import {
  assertCanViewUserCalendar,
  canViewOthersCalendars,
  canViewUserCalendar,
} from "@/lib/calendar/access";
import {
  dayBounds,
  monthRange,
  stripHtmlPreview,
  toDateKey,
} from "@/lib/calendar/dates";
import {
  getHolidayName,
  getHolidayRegion,
  getHolidaysInMonth,
} from "@/lib/calendar/holidays";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CalendarDayEntry = {
  id: string;
  kind: "log" | "task";
  title: string;
  preview: string | null;
  projectName: string | null;
  projectId?: string;
};

export type CalendarDaySummary = {
  date: string;
  hasLog: boolean;
  completedCount: number;
  preview: string | null;
  entries: CalendarDayEntry[];
  holidayName: string | null;
  isWeekend: boolean;
};

export type CalendarMonthData = {
  year: number;
  month: number;
  days: CalendarDaySummary[];
  daysLogged: number;
  tasksCompleted: number;
};

export type CalendarCompletedTask = {
  id: string;
  title: string;
  projectId: string;
  projectName: string | null;
  completedAt: string;
};

export type CalendarDayDetail = {
  date: string;
  logBody: string | null;
  completedTasks: CalendarCompletedTask[];
  holidayName: string | null;
};

export type CalendarViewableUser = {
  id: string;
  fullName: string | null;
};

function dataClientFor(targetUserId: string, viewerId: string) {
  return targetUserId === viewerId
    ? null
    : createSupabaseAdminClient();
}

async function resolveClient(targetUserId: string) {
  const me = await getCurrentUser();
  await assertCanViewUserCalendar(targetUserId);
  const admin = dataClientFor(targetUserId, me.id);
  const supabase = admin ?? (await createSupabaseServerClient());
  return { supabase, me };
}

function completedOnDate(completedAt: string, dateKey: string): boolean {
  return toDateKey(new Date(completedAt)) === dateKey;
}

export async function getCalendarMonth(
  userId: string,
  year: number,
  month: number,
): Promise<CalendarMonthData> {
  const { supabase } = await resolveClient(userId);
  const { startKey, endKey, daysInMonth } = monthRange(year, month);

  const { start } = dayBounds(startKey);
  const { end } = dayBounds(endKey);

  const [logsResult, tasksResult] = await Promise.all([
    supabase
      .from("daily_work_logs")
      .select("log_date, body")
      .eq("user_id", userId)
      .gte("log_date", startKey)
      .lte("log_date", endKey),
    supabase
      .from("tasks")
      .select("id, title, project_id, completed_at")
      .eq("assignee_id", userId)
      .eq("status", "done")
      .not("completed_at", "is", null)
      .gte("completed_at", start)
      .lte("completed_at", end)
      .order("completed_at", { ascending: true }),
  ]);

  if (logsResult.error) throw new Error(logsResult.error.message);
  if (tasksResult.error) throw new Error(tasksResult.error.message);

  const logByDate = new Map(
    (logsResult.data ?? []).map((row) => [row.log_date, row.body ?? ""]),
  );

  const projectIds = Array.from(
    new Set((tasksResult.data ?? []).map((t) => t.project_id)),
  );
  let projectNameById = new Map<string, string>();
  if (projectIds.length > 0) {
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name")
      .in("id", projectIds);
    projectNameById = new Map(projects?.map((p) => [p.id, p.name]) ?? []);
  }

  const tasksByDate = new Map<string, typeof tasksResult.data>();
  for (const t of tasksResult.data ?? []) {
    if (!t.completed_at) continue;
    const key = toDateKey(new Date(t.completed_at));
    const list = tasksByDate.get(key) ?? [];
    list.push(t);
    tasksByDate.set(key, list);
  }

  const holidayRegion = getHolidayRegion();
  const holidaysInMonth = getHolidaysInMonth(year, month, holidayRegion);

  const days: CalendarDaySummary[] = [];
  let daysLogged = 0;
  let tasksCompleted = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = toDateKey(new Date(year, month - 1, day));
    const dow = new Date(year, month - 1, day).getDay();
    const isWeekend = dow === 0 || dow === 6;
    const body = logByDate.get(date) ?? "";
    const hasLog = body.trim().length > 0;
    const dayTasks = tasksByDate.get(date) ?? [];
    const completedCount = dayTasks.length;
    const preview = hasLog ? stripHtmlPreview(body) : null;

    const entries: CalendarDayEntry[] = [];
    if (hasLog) {
      const fullPreview = preview ?? "";
      const logTitle = fullPreview
        ? fullPreview.length > 48
          ? `${fullPreview.slice(0, 47)}…`
          : fullPreview
        : "Work log";
      entries.push({
        id: `log-${date}`,
        kind: "log",
        title: logTitle,
        preview: fullPreview.length > 48 ? fullPreview : null,
        projectName: null,
      });
    }
    for (const t of dayTasks) {
      entries.push({
        id: t.id,
        kind: "task",
        title: t.title,
        preview: null,
        projectName: projectNameById.get(t.project_id) ?? null,
        projectId: t.project_id,
      });
    }

    if (hasLog) daysLogged += 1;
    tasksCompleted += completedCount;

    days.push({
      date,
      hasLog,
      completedCount,
      preview,
      entries,
      holidayName: holidaysInMonth.get(date) ?? null,
      isWeekend,
    });
  }

  return { year, month, days, daysLogged, tasksCompleted };
}

export async function getDayDetail(
  userId: string,
  dateKey: string,
): Promise<CalendarDayDetail> {
  const { supabase } = await resolveClient(userId);
  const { start, end } = dayBounds(dateKey);

  const [logResult, tasksResult] = await Promise.all([
    supabase
      .from("daily_work_logs")
      .select("body")
      .eq("user_id", userId)
      .eq("log_date", dateKey)
      .maybeSingle(),
    supabase
      .from("tasks")
      .select("id, title, project_id, completed_at")
      .eq("assignee_id", userId)
      .eq("status", "done")
      .not("completed_at", "is", null)
      .gte("completed_at", start)
      .lte("completed_at", end)
      .order("completed_at", { ascending: false }),
  ]);

  if (logResult.error) throw new Error(logResult.error.message);
  if (tasksResult.error) throw new Error(tasksResult.error.message);

  const projectIds = Array.from(
    new Set((tasksResult.data ?? []).map((t) => t.project_id)),
  );
  let projectNameById = new Map<string, string>();
  if (projectIds.length > 0) {
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name")
      .in("id", projectIds);
    projectNameById = new Map(projects?.map((p) => [p.id, p.name]) ?? []);
  }

  const body = logResult.data?.body ?? "";
  const logBody = body.trim().length > 0 ? body : null;

  const completedTasks: CalendarCompletedTask[] = (tasksResult.data ?? [])
    .filter((t) => t.completed_at && completedOnDate(t.completed_at, dateKey))
    .map((t) => ({
      id: t.id,
      title: t.title,
      projectId: t.project_id,
      projectName: projectNameById.get(t.project_id) ?? null,
      completedAt: t.completed_at!,
    }));

  return {
    date: dateKey,
    logBody,
    completedTasks,
    holidayName: getHolidayName(dateKey),
  };
}

/**
 * Users the caller may open in the calendar picker: always self; plus
 * teammates only when the caller is a workspace or project admin.
 */
export async function listCalendarViewableUsers(): Promise<CalendarViewableUser[]> {
  const me = await getCurrentUser();
  const canPick = await canViewOthersCalendars();
  if (!canPick) {
    return [{ id: me.id, fullName: me.fullName }];
  }

  const supabase = await createSupabaseServerClient();
  const admin = me.role === "admin" ? createSupabaseAdminClient() : null;

  let candidates: CalendarViewableUser[] = [];

  if (me.role === "admin") {
    const { data, error } = await admin!
      .from("profiles")
      .select("id, full_name")
      .order("full_name", { ascending: true });
    if (error) throw new Error(error.message);
    candidates = (data ?? []).map((p) => ({
      id: p.id,
      fullName: p.full_name,
    }));
  } else {
    const { data: adminProjects, error: projError } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", me.id)
      .eq("role", "admin");
    if (projError) throw new Error(projError.message);

    const projectIds = (adminProjects ?? []).map((r) => r.project_id);
    if (projectIds.length === 0) {
      return [{ id: me.id, fullName: me.fullName }];
    }

    const { data: memberships, error: memError } = await supabase
      .from("project_members")
      .select("user_id")
      .in("project_id", projectIds);
    if (memError) throw new Error(memError.message);

    const userIds = Array.from(
      new Set((memberships ?? []).map((m) => m.user_id)),
    );
    const { data: profiles, error: profError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds)
      .order("full_name", { ascending: true });
    if (profError) throw new Error(profError.message);

    candidates = (profiles ?? []).map((p) => ({
      id: p.id,
      fullName: p.full_name,
    }));
  }

  const allowed: CalendarViewableUser[] = [];
  for (const user of candidates) {
    if (await canViewUserCalendar(me.id, user.id)) {
      allowed.push(user);
    }
  }

  if (!allowed.some((u) => u.id === me.id)) {
    allowed.unshift({ id: me.id, fullName: me.fullName });
  }

  return allowed;
}

export async function getCalendarUserLabel(
  userId: string,
): Promise<string | null> {
  const { supabase } = await resolveClient(userId);
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.full_name ?? null;
}
