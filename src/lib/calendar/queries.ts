import "server-only";

import {
  assertCanViewUserCalendar,
  canViewOthersCalendars,
  canViewUserCalendar,
} from "@/lib/calendar/access";
import {
  dayBounds,
  monthRange,
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
import type { AttendanceStatus, TaskStatus } from "@/lib/supabase/types";

export type CalendarDayEntry = {
  id: string;
  /** "task" = a manually logged day task; "completed" = a real project task finished that day. */
  kind: "task" | "completed";
  title: string;
  status: TaskStatus | null;
  projectName: string | null;
  projectId?: string;
};

export type CalendarDaySummary = {
  date: string;
  entries: CalendarDayEntry[];
  holidayName: string | null;
  isWeekend: boolean;
  /** Stored attendance for this day; null when the user set nothing. */
  attendance: AttendanceStatus | null;
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

/** A manually logged task entry for a single day. */
export type CalendarTaskEntry = {
  id: string;
  title: string;
  status: TaskStatus;
  projectId: string | null;
  projectName: string | null;
  notes: string;
};

export type CalendarDayDetail = {
  date: string;
  taskEntries: CalendarTaskEntry[];
  completedTasks: CalendarCompletedTask[];
  holidayName: string | null;
  attendanceStatus: AttendanceStatus | null;
  attendanceNote: string;
};

export type CalendarProjectOption = {
  id: string;
  name: string;
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

  const [entriesResult, tasksResult, attendanceResult] = await Promise.all([
    supabase
      .from("daily_task_entries")
      .select("id, entry_date, title, status, project_id, position")
      .eq("user_id", userId)
      .gte("entry_date", startKey)
      .lte("entry_date", endKey)
      .order("position", { ascending: true }),
    supabase
      .from("tasks")
      .select("id, title, project_id, completed_at")
      .eq("assignee_id", userId)
      .eq("status", "done")
      .not("completed_at", "is", null)
      .gte("completed_at", start)
      .lte("completed_at", end)
      .order("completed_at", { ascending: true }),
    supabase
      .from("daily_attendance")
      .select("attendance_date, status")
      .eq("user_id", userId)
      .gte("attendance_date", startKey)
      .lte("attendance_date", endKey),
  ]);

  if (entriesResult.error) throw new Error(entriesResult.error.message);
  if (tasksResult.error) throw new Error(tasksResult.error.message);
  if (attendanceResult.error) throw new Error(attendanceResult.error.message);

  const attendanceByDate = new Map(
    (attendanceResult.data ?? []).map((a) => [a.attendance_date, a.status]),
  );

  const projectIds = Array.from(
    new Set([
      ...(tasksResult.data ?? []).map((t) => t.project_id),
      ...(entriesResult.data ?? [])
        .map((e) => e.project_id)
        .filter((id): id is string => id !== null),
    ]),
  );
  let projectNameById = new Map<string, string>();
  if (projectIds.length > 0) {
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name")
      .in("id", projectIds);
    projectNameById = new Map(projects?.map((p) => [p.id, p.name]) ?? []);
  }

  const entriesByDate = new Map<string, typeof entriesResult.data>();
  for (const e of entriesResult.data ?? []) {
    const list = entriesByDate.get(e.entry_date) ?? [];
    list.push(e);
    entriesByDate.set(e.entry_date, list);
  }

  const completedByDate = new Map<string, typeof tasksResult.data>();
  for (const t of tasksResult.data ?? []) {
    if (!t.completed_at) continue;
    const key = toDateKey(new Date(t.completed_at));
    const list = completedByDate.get(key) ?? [];
    list.push(t);
    completedByDate.set(key, list);
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
    const dayEntries = entriesByDate.get(date) ?? [];
    const completedTasks = completedByDate.get(date) ?? [];

    const entries: CalendarDayEntry[] = [];
    for (const e of dayEntries) {
      entries.push({
        id: e.id,
        kind: "task",
        title: e.title,
        status: e.status,
        projectName: e.project_id
          ? (projectNameById.get(e.project_id) ?? null)
          : null,
        projectId: e.project_id ?? undefined,
      });
    }
    for (const t of completedTasks) {
      entries.push({
        id: t.id,
        kind: "completed",
        title: t.title,
        status: "done",
        projectName: projectNameById.get(t.project_id) ?? null,
        projectId: t.project_id,
      });
    }

    if (dayEntries.length > 0) daysLogged += 1;
    tasksCompleted += completedTasks.length;

    days.push({
      date,
      entries,
      holidayName: holidaysInMonth.get(date) ?? null,
      isWeekend,
      attendance: attendanceByDate.get(date) ?? null,
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

  const [entriesResult, tasksResult, attendanceResult] = await Promise.all([
    supabase
      .from("daily_task_entries")
      .select("id, title, status, project_id, notes, position")
      .eq("user_id", userId)
      .eq("entry_date", dateKey)
      .order("position", { ascending: true }),
    supabase
      .from("tasks")
      .select("id, title, project_id, completed_at")
      .eq("assignee_id", userId)
      .eq("status", "done")
      .not("completed_at", "is", null)
      .gte("completed_at", start)
      .lte("completed_at", end)
      .order("completed_at", { ascending: false }),
    supabase
      .from("daily_attendance")
      .select("status, note")
      .eq("user_id", userId)
      .eq("attendance_date", dateKey)
      .maybeSingle(),
  ]);

  if (entriesResult.error) throw new Error(entriesResult.error.message);
  if (tasksResult.error) throw new Error(tasksResult.error.message);
  if (attendanceResult.error) throw new Error(attendanceResult.error.message);

  const projectIds = Array.from(
    new Set([
      ...(tasksResult.data ?? []).map((t) => t.project_id),
      ...(entriesResult.data ?? [])
        .map((e) => e.project_id)
        .filter((id): id is string => id !== null),
    ]),
  );
  let projectNameById = new Map<string, string>();
  if (projectIds.length > 0) {
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name")
      .in("id", projectIds);
    projectNameById = new Map(projects?.map((p) => [p.id, p.name]) ?? []);
  }

  const taskEntries: CalendarTaskEntry[] = (entriesResult.data ?? []).map(
    (e) => ({
      id: e.id,
      title: e.title,
      status: e.status,
      projectId: e.project_id,
      projectName: e.project_id
        ? (projectNameById.get(e.project_id) ?? null)
        : null,
      notes: e.notes ?? "",
    }),
  );

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
    taskEntries,
    completedTasks,
    holidayName: getHolidayName(dateKey),
    attendanceStatus: attendanceResult.data?.status ?? null,
    attendanceNote: attendanceResult.data?.note ?? "",
  };
}

/**
 * Projects the current user can attach to a day task entry. RLS scopes this
 * to projects the caller can see. Used only for editing the caller's own
 * calendar, so it always runs as the signed-in user.
 */
export async function listCalendarProjectOptions(): Promise<
  CalendarProjectOption[]
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
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

/** The signed-in user's stored attendance for a day (null if unset). */
export async function getMyAttendance(
  dateKey: string,
): Promise<AttendanceStatus | null> {
  const me = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("daily_attendance")
    .select("status")
    .eq("user_id", me.id)
    .eq("attendance_date", dateKey)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.status ?? null;
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
