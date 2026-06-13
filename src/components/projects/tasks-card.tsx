"use client";

import * as React from "react";
import { useActionState, useOptimistic, useTransition } from "react";
import {
  Check,
  ListFilter,
  ListPlus,
  MessageSquarePlus,
  Paperclip,
  Plus,
  X,
} from "lucide-react";
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
import { Popover } from "@/components/ui/popover";
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
import {
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_OPTIONS,
  type TaskPriority,
} from "@/types/project";

import { NoteEditor } from "./note-editor";
import { TaskNode } from "./task-node";

type StatusFilter = "all" | "open" | "done";
type PriorityFilter = "all" | TaskPriority;
type SortMode = "manual" | "due";

const MENU_ITEM =
  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]";

/** True when a node passes the active status filter (status is the only hide). */
function matchesStatus(node: TaskNodeData, status: StatusFilter): boolean {
  if (status === "all") return true;
  return status === "open" ? node.status !== "done" : node.status === "done";
}

/**
 * Keeps a node when it passes the status filter, or when one of its descendants
 * does (so a matching subtask is never orphaned from its parent).
 */
function filterByStatus(
  nodes: TaskNodeData[],
  status: StatusFilter,
): TaskNodeData[] {
  if (status === "all") return nodes;
  const out: TaskNodeData[] = [];
  for (const n of nodes) {
    const children = filterByStatus(n.children, status);
    if (children.length > 0 || matchesStatus(n, status)) {
      out.push({ ...n, children });
    }
  }
  return out;
}

const SEVERITY: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

/**
 * Ranks a task's priority for sorting (lower sorts higher). The chosen priority
 * floats above everything; the rest follow severity (high, then medium, then
 * low); tasks with no priority sit last.
 */
function priorityRank(
  priority: TaskPriority | null,
  selected: PriorityFilter,
): number {
  if (selected !== "all" && priority === selected) return -1;
  if (priority === null) return 99;
  return SEVERITY[priority];
}

/**
 * Sorts sibling groups (recursively) without hiding anything. Done tasks always
 * sink to the bottom; above them, the chosen mode applies — by due date, or by
 * priority (selected first, then High > Medium > Low). Equal keys keep their
 * manual order because Array.prototype.sort is stable.
 */
function sortTree(
  nodes: TaskNodeData[],
  mode: SortMode,
  priority: PriorityFilter,
): TaskNodeData[] {
  const usePriority = mode !== "due" && priority !== "all";
  if (mode !== "due" && !usePriority) return nodes;

  const compare = (a: TaskNodeData, b: TaskNodeData) => {
    const ad = a.status === "done" ? 1 : 0;
    const bd = b.status === "done" ? 1 : 0;
    if (ad !== bd) return ad - bd; // done last, always
    if (mode === "due") {
      const at = a.due_date ? Date.parse(a.due_date) : Infinity;
      const bt = b.due_date ? Date.parse(b.due_date) : Infinity;
      return at - bt;
    }
    return priorityRank(a.priority, priority) - priorityRank(b.priority, priority);
  };

  return [...nodes]
    .sort(compare)
    .map((n) => ({ ...n, children: sortTree(n.children, mode, priority) }));
}

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

  // Which optional fields are revealed on the add-task form.
  const [extras, setExtras] = React.useState({
    note: false,
    file: false,
    subtask: false,
  });
  // Bumped after each successful add to remount the rich-text note editor,
  // whose content (unlike the native inputs) isn't cleared by form.reset().
  const [resetKey, setResetKey] = React.useState(0);

  // Task list filters/sort. All client-side over the already-loaded tree.
  // Uncompleted is the default view so finished work stays out of the way.
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("open");
  const [priorityFilter, setPriorityFilter] =
    React.useState<PriorityFilter>("all");
  const [sortMode, setSortMode] = React.useState<SortMode>("manual");

  // Depend on the whole `state` object (a fresh reference each submit) rather
  // than `state.ok`, so a second successful add still triggers the reset even
  // though `ok` stays true between them.
  React.useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResetKey((k) => k + 1);
    }
  }, [state]);

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
    // The due-date sort would immediately re-sort a manual move, so block it.
    if (reorderDisabled) return;
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

  // Status is the only control that hides tasks; priority and due re-sort the
  // full list. Any active control lights the trigger dot, but a manual drag
  // only makes sense when nothing is re-sorting, so priority/due disable it.
  const filtersActive =
    statusFilter !== "all" || priorityFilter !== "all" || sortMode !== "manual";
  const reorderDisabled = sortMode !== "manual" || priorityFilter !== "all";
  const viewTree = React.useMemo(
    () =>
      sortTree(
        filterByStatus(tree, statusFilter),
        sortMode,
        priorityFilter,
      ),
    [tree, statusFilter, priorityFilter, sortMode],
  );
  const visibleTasks = countTasks(viewTree);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks</CardTitle>
        <CardDescription>
          {visibleTasks !== totalTasks
            ? `${visibleTasks} of ${totalTasks} task${totalTasks === 1 ? "" : "s"} shown`
            : `${totalTasks} task${totalTasks === 1 ? "" : "s"}`}
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
              <Label htmlFor="dueDate">Due (date &amp; time)</Label>
              <Input id="dueDate" name="dueDate" type="datetime-local" />
            </div>
          </div>

          {/* Toggleable extras: attach a note, a file, and/or a first subtask
              while creating the task. Each posts in the same form. */}
          <div className="flex flex-wrap gap-2">
            <ExtraToggle
              active={extras.note}
              onClick={() => setExtras((e) => ({ ...e, note: !e.note }))}
            >
              <MessageSquarePlus className="size-3.5" />
              Note
            </ExtraToggle>
            <ExtraToggle
              active={extras.file}
              onClick={() => setExtras((e) => ({ ...e, file: !e.file }))}
            >
              <Paperclip className="size-3.5" />
              File
            </ExtraToggle>
            <ExtraToggle
              active={extras.subtask}
              onClick={() => setExtras((e) => ({ ...e, subtask: !e.subtask }))}
            >
              <ListPlus className="size-3.5" />
              Subtask
            </ExtraToggle>
          </div>

          {extras.note ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="noteTitle">Note</Label>
              <Input
                id="noteTitle"
                name="noteTitle"
                placeholder="Note title (optional)"
              />
              <NoteEditor key={resetKey} name="noteBody" />
            </div>
          ) : null}

          {extras.file ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="taskFile">Attach file</Label>
              <Input id="taskFile" name="file" type="file" />
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Max 50MB. Stored privately; access follows project membership.
              </p>
            </div>
          ) : null}

          {extras.subtask ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="subtaskTitle">First subtask</Label>
              <Input
                id="subtaskTitle"
                name="subtaskTitle"
                placeholder="What's the first step?"
                maxLength={200}
              />
            </div>
          ) : null}

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

        {tree.length > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--color-muted-foreground)]">
              {visibleTasks !== totalTasks
                ? `Showing ${visibleTasks} of ${totalTasks}`
                : `${totalTasks} task${totalTasks === 1 ? "" : "s"}`}
            </span>
            <TaskFilterBar
              status={statusFilter}
              priority={priorityFilter}
              sort={sortMode}
              active={filtersActive}
              onStatus={setStatusFilter}
              onPriority={setPriorityFilter}
              onSort={setSortMode}
              onClear={() => {
                setStatusFilter("all");
                setPriorityFilter("all");
                setSortMode("manual");
              }}
            />
          </div>
        ) : null}

        {tree.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
            No tasks yet.
          </p>
        ) : viewTree.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
            No tasks match the current filter.
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
              items={viewTree.map((n) => n.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="overflow-hidden rounded-lg border border-[var(--color-border)]">
                {viewTree.map((node) => (
                  <TaskNode
                    key={node.id}
                    node={node}
                    members={members}
                    notesByTaskId={notesByTaskId}
                    attachmentsByTaskId={attachmentsByTaskId}
                    canManage={canManage}
                    reorderable={!reorderDisabled}
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

/** A pill button that reveals an optional field on the add-task form. */
function ExtraToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
          : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
      }`}
    >
      {active ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
      {children}
    </button>
  );
}

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All tasks" },
  { value: "open", label: "Uncompleted" },
  { value: "done", label: "Completed" },
];

const PRIORITY_FILTERS: { value: PriorityFilter; label: string }[] = [
  { value: "all", label: "Any priority" },
  ...TASK_PRIORITY_OPTIONS.map((value) => ({
    value,
    label: TASK_PRIORITY_LABEL[value],
  })),
];

const SORT_MODES: { value: SortMode; label: string }[] = [
  { value: "manual", label: "Manual order" },
  { value: "due", label: "By due date" },
];

/**
 * "Filter" button opening a popover of radio-style choices for status,
 * priority, and sort order. A dot on the trigger marks an active filter, and a
 * Clear action resets everything.
 */
function TaskFilterBar({
  status,
  priority,
  sort,
  active,
  onStatus,
  onPriority,
  onSort,
  onClear,
}: {
  status: StatusFilter;
  priority: PriorityFilter;
  sort: SortMode;
  active: boolean;
  onStatus: (value: StatusFilter) => void;
  onPriority: (value: PriorityFilter) => void;
  onSort: (value: SortMode) => void;
  onClear: () => void;
}) {
  return (
    <Popover
      align="end"
      triggerLabel="Filter and sort tasks"
      triggerClassName="relative inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-medium hover:bg-[var(--color-accent)]"
      trigger={
        <>
          <ListFilter className="size-4" />
          Filter
          {active ? (
            <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-[var(--color-primary)]" />
          ) : null}
        </>
      }
      className="w-56"
    >
      <FilterGroup label="Status">
        {STATUS_FILTERS.map((o) => (
          <FilterOption
            key={o.value}
            label={o.label}
            selected={status === o.value}
            onClick={() => onStatus(o.value)}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Priority">
        {PRIORITY_FILTERS.map((o) => (
          <FilterOption
            key={o.value}
            label={o.label}
            selected={priority === o.value}
            onClick={() => onPriority(o.value)}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Sort">
        {SORT_MODES.map((o) => (
          <FilterOption
            key={o.value}
            label={o.label}
            selected={sort === o.value}
            onClick={() => onSort(o.value)}
          />
        ))}
      </FilterGroup>

      {active ? (
        <button
          type="button"
          onClick={onClear}
          className={`${MENU_ITEM} mt-1 border-t border-[var(--color-border)] pt-2 text-[var(--color-muted-foreground)]`}
        >
          <X className="size-4 shrink-0" />
          <span className="flex-1">Clear filters</span>
        </button>
      ) : null}
    </Popover>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-1 py-1">
      <div className="px-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {label}
      </div>
      {children}
    </div>
  );
}

function FilterOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={onClick}
      className={MENU_ITEM}
    >
      <span className="flex-1">{label}</span>
      {selected ? <Check className="size-4 shrink-0" /> : null}
    </button>
  );
}
