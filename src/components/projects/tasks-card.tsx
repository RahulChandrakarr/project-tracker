"use client";

import * as React from "react";
import { useActionState, useOptimistic, useTransition } from "react";
import { Plus } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import {
  createTask,
  reorderTasks,
  type TaskFormState,
} from "@/lib/tasks/mutations";
import type { TaskNode as TaskNodeData } from "@/lib/tasks/queries";
import type { ProjectMember } from "@/lib/members/queries";
import type { Note } from "@/lib/notes/queries";
import type { ProjectDocument } from "@/lib/documents/queries";
import { TASK_PRIORITY_LABEL, TASK_PRIORITY_OPTIONS } from "@/types/project";

import { TaskNode } from "./task-node";

/** Maps every task id to its parent id and status for sibling-scoped drags. */
function indexTree(roots: TaskNodeData[]) {
  const parentOf = new Map<string, string | null>();
  const statusOf = new Map<string, string>();
  const visit = (node: TaskNodeData, parentId: string | null) => {
    parentOf.set(node.id, parentId);
    statusOf.set(node.id, node.status);
    node.children.forEach((c) => visit(c, node.id));
  };
  roots.forEach((n) => visit(n, null));
  return { parentOf, statusOf };
}

/** Ordered child ids for a parent (root ids when parentId is null). */
function siblingIdsOf(
  roots: TaskNodeData[],
  parentId: string | null,
): string[] {
  if (parentId === null) return roots.map((n) => n.id);
  let found: TaskNodeData | null = null;
  const visit = (node: TaskNodeData) => {
    if (found) return;
    if (node.id === parentId) {
      found = node;
      return;
    }
    node.children.forEach(visit);
  };
  roots.forEach(visit);
  return found ? (found as TaskNodeData).children.map((n) => n.id) : [];
}

/** Stable sort that keeps done ids last while preserving the given order. */
function sinkDoneIds(ids: string[], statusOf: Map<string, string>): string[] {
  return [...ids].sort(
    (a, b) =>
      (statusOf.get(a) === "done" ? 1 : 0) -
      (statusOf.get(b) === "done" ? 1 : 0),
  );
}

function reorderChildren(
  nodes: TaskNodeData[],
  orderedIds: string[],
): TaskNodeData[] {
  const byId = new Map(nodes.map((n) => [n.id, n] as const));
  const next = orderedIds
    .map((id) => byId.get(id))
    .filter((n): n is TaskNodeData => Boolean(n));
  // If the order doesn't account for every child, leave the group untouched.
  return next.length === nodes.length ? next : nodes;
}

/** Returns a new tree with one sibling group reordered to `orderedIds`. */
function applyOrder(
  roots: TaskNodeData[],
  parentId: string | null,
  orderedIds: string[],
): TaskNodeData[] {
  if (parentId === null) return reorderChildren(roots, orderedIds);
  const recurse = (node: TaskNodeData): TaskNodeData => {
    if (node.id === parentId) {
      return { ...node, children: reorderChildren(node.children, orderedIds) };
    }
    return node.children.length
      ? { ...node, children: node.children.map(recurse) }
      : node;
  };
  return roots.map(recurse);
}

const INITIAL: TaskFormState = { ok: false };

export function TasksCard({
  projectId,
  tree: serverTree,
  members,
  notesByTaskId,
  attachmentsByTaskId,
  canManage,
  currentUserId,
}: {
  projectId: string;
  tree: TaskNodeData[];
  members: ProjectMember[];
  notesByTaskId: Map<string, Note[]>;
  attachmentsByTaskId: Map<string, ProjectDocument[]>;
  canManage: boolean;
  currentUserId: string;
}) {
  const [state, formAction, pending] = useActionState(createTask, INITIAL);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  // Optimistic order so a drag lands instantly; reverts to the server tree
  // once the reorder action's transition completes (revalidation).
  const [tree, applyOptimisticOrder] = useOptimistic(
    serverTree,
    (
      state: TaskNodeData[],
      action: { parentId: string | null; orderedIds: string[] },
    ) => applyOrder(state, action.parentId, action.orderedIds),
  );
  const [, startReorder] = useTransition();

  const sensors = useSensors(
    // A small drag threshold so taps on the row's buttons/popovers still click.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    const { parentOf, statusOf } = indexTree(tree);
    const parentId = parentOf.get(activeId) ?? null;
    // Siblings only: ignore drops that would change nesting.
    if (parentId !== (parentOf.get(overId) ?? null)) return;

    const siblings = siblingIdsOf(tree, parentId);
    const oldIndex = siblings.indexOf(activeId);
    const newIndex = siblings.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0) return;

    // Apply the move, then re-sink done tasks so the saved order matches what
    // the server query will render back.
    const orderedIds = sinkDoneIds(
      arrayMove(siblings, oldIndex, newIndex),
      statusOf,
    );

    startReorder(async () => {
      applyOptimisticOrder({ parentId, orderedIds });
      try {
        await reorderTasks({ projectId, orderedIds });
      } catch {
        // Revalidation restores the true order; nothing else to do here.
      }
    });
  }

  const totalTasks = countTasks(tree);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks</CardTitle>
        <CardDescription>
          {totalTasks} task{totalTasks === 1 ? "" : "s"}
          {canManage
            ? ". Assign to members, break into subtasks, add notes. Drag the handle to reorder; completed tasks sink to the bottom."
            : ". Add tasks and update their status."}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <form
          ref={formRef}
          action={formAction}
          className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] p-4"
        >
          <input type="hidden" name="projectId" value={projectId} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">New task</Label>
            <Input
              id="title"
              name="title"
              placeholder="What needs doing?"
              required
              maxLength={200}
            />
            {state.fieldErrors?.title ? (
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {state.fieldErrors.title}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {canManage ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assigneeId">Assignee</Label>
                <SelectNative id="assigneeId" name="assigneeId" defaultValue="">
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.fullName ?? m.userId.slice(0, 8)}
                    </option>
                  ))}
                </SelectNative>
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Status</Label>
              <SelectNative id="status" name="status" defaultValue="todo">
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priority">Priority</Label>
              <SelectNative id="priority" name="priority" defaultValue="">
                <option value="">Not set</option>
                {TASK_PRIORITY_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {TASK_PRIORITY_LABEL[value]}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dueDate">Due</Label>
              <Input id="dueDate" name="dueDate" type="date" />
            </div>
          </div>

          {state.message && !state.ok ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {state.message}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={pending}>
              <Plus />
              Add task
            </Button>
          </div>
        </form>

        {tree.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
            No tasks yet.
          </p>
        ) : (
          <DndContext
            // Stable id so dnd-kit's generated aria-describedby matches between
            // server and client render (its default uses a module counter that
            // drifts across SSR requests, causing a hydration mismatch).
            id={`tasks-${projectId}`}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={tree.map((n) => n.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="overflow-hidden rounded-lg border border-[var(--color-border)]">
                {tree.map((node) => (
                  <TaskNode
                    key={node.id}
                    node={node}
                    members={members}
                    notesByTaskId={notesByTaskId}
                    attachmentsByTaskId={attachmentsByTaskId}
                    canManage={canManage}
                    currentUserId={currentUserId}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}

function countTasks(nodes: TaskNodeData[]): number {
  let total = 0;
  for (const n of nodes) {
    total += 1 + countTasks(n.children);
  }
  return total;
}
