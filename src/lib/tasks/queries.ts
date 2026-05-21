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
 * Flat list of tasks for a project, joined with assignee profile data.
 * Use this for table-style displays. For tree rendering, pass the result
 * to `buildTaskTree`.
 */
export async function listProjectTasks(projectId: string): Promise<Task[]> {
  const supabase = await createSupabaseServerClient();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
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
