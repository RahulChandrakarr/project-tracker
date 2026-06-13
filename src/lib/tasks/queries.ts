import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type TaskRow = Tables<"tasks">;

export type Task = TaskRow & {
  assignee: { id: string; fullName: string | null } | null;
};

export type TaskNode = Task & {
  children: TaskNode[];
  depth: number;
};

/**
 * Flat list of a project's tasks the current viewer is assigned to or created,
 * joined with assignee profile data. Scoped to the signed-in user so the
 * project board shows only their own work. Use this for table-style displays.
 * For tree rendering, pass the result to `buildTaskTree`.
 */
export async function listProjectTasks(projectId: string): Promise<Task[]> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .or(`assignee_id.eq.${user.id},created_by.eq.${user.id}`)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to load tasks: ${error.message}`);
  if (!tasks?.length) return [];

  const assigneeIds = Array.from(
    new Set(
      tasks.map((t) => t.assignee_id).filter((id): id is string => Boolean(id)),
    ),
  );

  let nameById = new Map<string, string | null>();
  if (assigneeIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", assigneeIds);
    nameById = new Map(profiles?.map((p) => [p.id, p.full_name]) ?? []);
  }

  return tasks.map((t) => ({
    ...t,
    assignee: t.assignee_id
      ? { id: t.assignee_id, fullName: nameById.get(t.assignee_id) ?? null }
      : null,
  }));
}

/**
 * A task paired with the project it belongs to. Used by the dashboard's
 * cross-project task tables, where each row links back to its project.
 */
export type DashboardTask = TaskRow & {
  project: { id: string; name: string } | null;
};

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Attaches the owning project's id + name to each task. Mirrors the assignee
 * hydration in `listProjectTasks`: a separate `in` query instead of a
 * PostgREST embed (the generated types carry no FK relationship for tasks).
 */
async function attachProjects(
  supabase: ServerClient,
  tasks: TaskRow[],
): Promise<DashboardTask[]> {
  if (!tasks.length) return [];

  const projectIds = Array.from(new Set(tasks.map((t) => t.project_id)));
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .in("id", projectIds);
  const nameById = new Map(projects?.map((p) => [p.id, p.name]) ?? []);

  return tasks.map((t) => ({
    ...t,
    project: nameById.has(t.project_id)
      ? { id: t.project_id, name: nameById.get(t.project_id)! }
      : null,
  }));
}

/**
 * Open (not-done) tasks assigned to the current viewer, soonest deadline first
 * (tasks with no deadline sink to the end). Scoped to the signed-in user's own
 * assignments so the dashboard shows only their work.
 */
export async function listOpenTasks(limit = 8): Promise<DashboardTask[]> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("assignee_id", user.id)
    .neq("status", "done")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Failed to load open tasks: ${error.message}`);
  return attachProjects(supabase, tasks ?? []);
}

/**
 * Tasks assigned to the current viewer and marked done, most recently completed
 * first. `completed_at` is stamped by `updateTaskStatus` when a task goes done.
 */
export async function listRecentlyCompletedTasks(
  limit = 8,
): Promise<DashboardTask[]> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("assignee_id", user.id)
    .eq("status", "done")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error)
    throw new Error(`Failed to load completed tasks: ${error.message}`);
  return attachProjects(supabase, tasks ?? []);
}

/**
 * Per-member task stats for a project, used by the team metrics card. Reads
 * every task in the project (RLS already limits this to project members), not
 * just the viewer's own, so the bars reflect the whole team. Members with no
 * assigned tasks are omitted; the rest come back busiest-first.
 */
export type MemberMetric = {
  userId: string;
  fullName: string | null;
  assigned: number;
  done: number;
  open: number;
  highPriorityOpen: number;
  /** Share of assigned tasks completed, 0..1. */
  completionRate: number;
  /** Mean days from creation to completion across done tasks, or null. */
  avgCompletionDays: number | null;
};

export async function listMemberMetrics(
  projectId: string,
): Promise<MemberMetric[]> {
  const supabase = await createSupabaseServerClient();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("assignee_id, status, priority, created_at, completed_at")
    .eq("project_id", projectId);

  if (error) throw new Error(`Failed to load metrics: ${error.message}`);
  if (!tasks?.length) return [];

  type Acc = {
    assigned: number;
    done: number;
    highPriorityOpen: number;
    completionMs: number;
    completionSamples: number;
  };
  const byUser = new Map<string, Acc>();

  for (const t of tasks) {
    if (!t.assignee_id) continue; // unassigned work isn't a member's stat
    const acc =
      byUser.get(t.assignee_id) ??
      {
        assigned: 0,
        done: 0,
        highPriorityOpen: 0,
        completionMs: 0,
        completionSamples: 0,
      };
    acc.assigned += 1;
    if (t.status === "done") {
      acc.done += 1;
      if (t.completed_at && t.created_at) {
        const span = Date.parse(t.completed_at) - Date.parse(t.created_at);
        if (Number.isFinite(span) && span >= 0) {
          acc.completionMs += span;
          acc.completionSamples += 1;
        }
      }
    } else if (t.priority === "high") {
      acc.highPriorityOpen += 1;
    }
    byUser.set(t.assignee_id, acc);
  }

  const userIds = Array.from(byUser.keys());
  let nameById = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    nameById = new Map(profiles?.map((p) => [p.id, p.full_name]) ?? []);
  }

  const dayMs = 1000 * 60 * 60 * 24;
  return userIds
    .map((userId) => {
      const a = byUser.get(userId)!;
      return {
        userId,
        fullName: nameById.get(userId) ?? null,
        assigned: a.assigned,
        done: a.done,
        open: a.assigned - a.done,
        highPriorityOpen: a.highPriorityOpen,
        completionRate: a.assigned > 0 ? a.done / a.assigned : 0,
        avgCompletionDays:
          a.completionSamples > 0
            ? a.completionMs / a.completionSamples / dayMs
            : null,
      };
    })
    .sort((x, y) => y.assigned - x.assigned);
}

/**
 * Stable sort that floats done tasks to the bottom of a sibling group while
 * preserving the incoming (position) order within the done and not-done
 * groups. Array.prototype.sort is stable, so equal keys keep their order.
 */
function sinkDone(nodes: TaskNode[]): void {
  nodes.sort(
    (a, b) => (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0),
  );
  for (const n of nodes) sinkDone(n.children);
}

/**
 * Builds a tree from a flat task list. Tasks with no parent_id (or with a
 * parent_id pointing to a task not in the list) become roots. Siblings keep
 * the flat list's order (position), then done tasks are sunk to the bottom of
 * each group so completed work always renders last.
 */
export function buildTaskTree(tasks: Task[]): TaskNode[] {
  const byId = new Map<string, TaskNode>();
  for (const t of tasks) {
    byId.set(t.id, { ...t, children: [], depth: 0 });
  }

  const roots: TaskNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : null;
    if (parent) {
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Depth on children was set during the first pass relative to parent's
  // depth at that time. Second pass to correct depths after all parents
  // are resolved.
  function fix(node: TaskNode, depth: number) {
    node.depth = depth;
    for (const c of node.children) fix(c, depth + 1);
  }
  for (const r of roots) fix(r, 0);

  sinkDone(roots);

  return roots;
}
