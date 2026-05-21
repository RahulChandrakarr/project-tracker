"use client";

import * as React from "react";
import { useActionState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import {
  createTask,
  deleteTask,
  updateTaskAssignee,
  updateTaskStatus,
  type TaskFormState,
} from "@/lib/tasks/mutations";
import type { TaskNode as TaskNodeData } from "@/lib/tasks/queries";
import type { ProjectMember } from "@/lib/members/queries";
import type { Note } from "@/lib/notes/queries";
import type { TaskStatus } from "@/types/project";
import { formatDate } from "@/lib/format";

import { NotesList } from "./notes-list";

const INITIAL: TaskFormState = { ok: false };

const MAX_DEPTH_INDENT = 6;

export function TaskNode({
  node,
  members,
  notesByTaskId,
  canManage,
  currentUserId,
}: {
  node: TaskNodeData;
  members: ProjectMember[];
  notesByTaskId: Map<string, Note[]>;
  canManage: boolean;
  currentUserId: string;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [showSubtaskForm, setShowSubtaskForm] = React.useState(false);

  const indentLevel = Math.min(node.depth, MAX_DEPTH_INDENT);
  const ownNotes = notesByTaskId.get(node.id) ?? [];

  return (
    <li
      className="border-b border-[var(--color-border)] last:border-b-0"
      style={{ paddingLeft: `${indentLevel * 16}px` }}
    >
      <div className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Collapse" : "Expand"}
          aria-expanded={expanded}
          className="grid size-6 shrink-0 place-items-center rounded text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
        >
          {expanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{node.title}</div>
          <div className="text-xs text-[var(--color-muted-foreground)]">
            Due {formatDate(node.due_date)}
            {node.assignee?.fullName
              ? ` · ${node.assignee.fullName}`
              : node.assignee
                ? ` · ${node.assignee.id.slice(0, 8)}`
                : " · Unassigned"}
            {node.children.length > 0
              ? ` · ${node.children.length} subtask${node.children.length === 1 ? "" : "s"}`
              : null}
            {ownNotes.length > 0
              ? ` · ${ownNotes.length} note${ownNotes.length === 1 ? "" : "s"}`
              : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canManage ? (
            <AssigneeSelect
              key={node.assignee_id ?? "none"}
              taskId={node.id}
              projectId={node.project_id}
              initial={node.assignee_id ?? ""}
              members={members}
            />
          ) : null}

          <StatusSelect
            key={node.status}
            taskId={node.id}
            projectId={node.project_id}
            initial={node.status}
          />

          {canManage ? (
            <form action={deleteTask}>
              <input type="hidden" name="taskId" value={node.id} />
              <input type="hidden" name="projectId" value={node.project_id} />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                aria-label={`Delete ${node.title}`}
              >
                <Trash2 />
              </Button>
            </form>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <div className="flex flex-col gap-4 pb-4 pl-9 pr-2">
          <div className="flex flex-col gap-2">
            <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
              Notes
            </div>
            <NotesList
              projectId={node.project_id}
              taskId={node.id}
              notes={ownNotes}
              currentUserId={currentUserId}
              canManage={canManage}
              emptyLabel="No notes on this task yet."
            />
          </div>

          {showSubtaskForm ? (
            <NewSubtaskForm
              projectId={node.project_id}
              parentId={node.id}
              members={members}
              canManage={canManage}
              onClose={() => setShowSubtaskForm(false)}
            />
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSubtaskForm(true)}
              className="self-start"
            >
              <Plus />
              Add subtask
            </Button>
          )}
        </div>
      ) : null}

      {node.children.length > 0 ? (
        <ul>
          {node.children.map((c) => (
            <TaskNode
              key={c.id}
              node={c}
              members={members}
              notesByTaskId={notesByTaskId}
              canManage={canManage}
              currentUserId={currentUserId}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * Controlled status dropdown. Controlled (not defaultValue) because React 19
 * resets a <form action> after it runs, which would otherwise snap an
 * uncontrolled select back to its old value. The `key={status}` on the call
 * site re-seeds this when the server value changes (e.g. another user edits).
 */
function StatusSelect({
  taskId,
  projectId,
  initial,
}: {
  taskId: string;
  projectId: string;
  initial: TaskStatus;
}) {
  const [value, setValue] = React.useState<TaskStatus>(initial);

  return (
    <form action={updateTaskStatus}>
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="projectId" value={projectId} />
      <SelectNative
        name="status"
        value={value}
        className="h-8 w-32 text-xs"
        onChange={(e) => {
          setValue(e.currentTarget.value as TaskStatus);
          e.currentTarget.form?.requestSubmit();
        }}
      >
        <option value="todo">To do</option>
        <option value="in_progress">In progress</option>
        <option value="done">Done</option>
      </SelectNative>
    </form>
  );
}

/** Controlled assignee dropdown. Same reasoning as StatusSelect. */
function AssigneeSelect({
  taskId,
  projectId,
  initial,
  members,
}: {
  taskId: string;
  projectId: string;
  initial: string;
  members: ProjectMember[];
}) {
  const [value, setValue] = React.useState(initial);

  return (
    <form action={updateTaskAssignee}>
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="projectId" value={projectId} />
      <SelectNative
        name="assigneeId"
        value={value}
        className="h-8 w-40 text-xs"
        onChange={(e) => {
          setValue(e.currentTarget.value);
          e.currentTarget.form?.requestSubmit();
        }}
      >
        <option value="">Unassigned</option>
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.fullName ?? m.userId.slice(0, 8)}
          </option>
        ))}
      </SelectNative>
    </form>
  );
}

function NewSubtaskForm({
  projectId,
  parentId,
  members,
  canManage,
  onClose,
}: {
  projectId: string;
  parentId: string;
  members: ProjectMember[];
  canManage: boolean;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(createTask, INITIAL);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-md border border-[var(--color-border)] p-3"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="parentId" value={parentId} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`sub-title-${parentId}`} className="text-xs">
          Subtask title
        </Label>
        <Input
          id={`sub-title-${parentId}`}
          name="title"
          required
          maxLength={200}
          placeholder="What's the next step?"
        />
        {state.fieldErrors?.title ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {state.fieldErrors.title}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {canManage ? (
          <SelectNative name="assigneeId" defaultValue="" className="text-xs">
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.fullName ?? m.userId.slice(0, 8)}
              </option>
            ))}
          </SelectNative>
        ) : null}
        <SelectNative name="status" defaultValue="todo" className="text-xs">
          <option value="todo">To do</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
        </SelectNative>
        <Input name="dueDate" type="date" className="text-xs" />
      </div>

      {state.message && !state.ok ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          Add subtask
        </Button>
      </div>
    </form>
  );
}
