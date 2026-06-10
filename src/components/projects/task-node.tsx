"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleCheck,
  CircleDot,
  ExternalLink,
  FileText,
  Gauge,
  GripVertical,
  ListPlus,
  MessageSquarePlus,
  Paperclip,
  Pencil,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Trash2,
  Upload,
  UserRoundPlus,
  type LucideIcon,
} from "lucide-react";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover } from "@/components/ui/popover";
import { SelectNative } from "@/components/ui/select-native";
import {
  createTask,
  deleteTask,
  updateTask,
  updateTaskAssignee,
  updateTaskPriority,
  updateTaskStatus,
  type TaskFormState,
} from "@/lib/tasks/mutations";
import {
  deleteDocument,
  uploadFile,
  type DocumentFormState,
} from "@/lib/documents/actions";
import type { ProjectDocument } from "@/lib/documents/queries";
import type { TaskNode as TaskNodeData } from "@/lib/tasks/queries";
import type { ProjectMember } from "@/lib/members/queries";
import type { Note } from "@/lib/notes/queries";
import {
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_LABEL,
  type TaskPriority,
  type TaskStatus,
} from "@/types/project";
import { formatDate } from "@/lib/format";

import { NotesList } from "./notes-list";

const MENU_ITEM =
  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)] focus-visible:bg-[var(--color-accent)] focus-visible:text-[var(--color-accent-foreground)] focus-visible:outline-none";

const STATUS_META = {
  todo: { Icon: Circle, className: "text-[var(--color-muted-foreground)]" },
  in_progress: { Icon: CircleDot, className: "text-amber-500" },
  done: { Icon: CircleCheck, className: "text-emerald-500" },
} satisfies Record<TaskStatus, { Icon: LucideIcon; className: string }>;

const PRIORITY_META = {
  low: { Icon: SignalLow, className: "text-emerald-500" },
  medium: { Icon: SignalMedium, className: "text-amber-500" },
  high: { Icon: SignalHigh, className: "text-rose-500" },
} satisfies Record<TaskPriority, { Icon: LucideIcon; className: string }>;

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const INITIAL: TaskFormState = { ok: false };
const INITIAL_DOC: DocumentFormState = { ok: false };

const MAX_DEPTH_INDENT = 6;

/** The single inline form a task row can have open at any one time. */
type OpenForm = "note" | "subtask" | "edit" | "attach" | null;

export function TaskNode({
  node,
  members,
  notesByTaskId,
  attachmentsByTaskId,
  canManage,
  currentUserId,
}: {
  node: TaskNodeData;
  members: ProjectMember[];
  notesByTaskId: Map<string, Note[]>;
  attachmentsByTaskId: Map<string, ProjectDocument[]>;
  canManage: boolean;
  currentUserId: string;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [openForm, setOpenForm] = React.useState<OpenForm>(null);

  const indentLevel = Math.min(node.depth, MAX_DEPTH_INDENT);
  const ownNotes = notesByTaskId.get(node.id) ?? [];
  const ownAttachments = attachmentsByTaskId.get(node.id) ?? [];
  const isTopLevel = indentLevel === 0;

  // The toolbar add actions live in the row, so triggering one also expands the
  // node to reveal the form it opens. Only one form is ever open at a time.
  const open = (form: Exclude<OpenForm, null>) => {
    setExpanded(true);
    setOpenForm(form);
  };

  // Sortable row. Disabled for non-managers (no reorder permission). The
  // transform/transition animate the row during a sibling drag.
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id, disabled: !canManage });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`border-b border-[var(--color-border)] last:border-b-0 ${
        isDragging ? "relative z-10 opacity-60" : ""
      }`}
    >
      <div
        className={`relative flex flex-col gap-2 py-3 pr-2 md:flex-row md:items-center md:gap-3 ${
          isTopLevel ? "bg-[var(--color-muted)]" : ""
        }`}
        style={{ paddingLeft: `${12 + indentLevel * 24}px` }}
      >
        {/* Hierarchy guide rails: one vertical line per ancestor level,
            aligned under that ancestor's chevron so subtasks read as a tree. */}
        {Array.from({ length: indentLevel }).map((_, i) => (
          <span
            key={i}
            aria-hidden
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-[var(--color-border)]"
            style={{ left: `${(i + 1) * 24}px` }}
          />
        ))}

        <div className="flex shrink-0 items-center">
          {canManage ? (
            <button
              type="button"
              aria-label={`Drag to reorder ${node.title}`}
              className="grid size-6 cursor-grab touch-none place-items-center rounded text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)] active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="size-4" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse" : "Expand"}
            aria-expanded={expanded}
            className="grid size-6 place-items-center rounded text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
          >
            {expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div
            className={`truncate text-sm ${
              isTopLevel ? "font-semibold" : "font-medium"
            }`}
          >
            {node.title}
          </div>
          <div className="text-xs text-[var(--color-muted-foreground)]">
            Due {formatDate(node.due_date)}
            {node.assignee?.fullName
              ? ` · ${node.assignee.fullName}`
              : node.assignee
                ? ` · ${node.assignee.id.slice(0, 8)}`
                : " · Unassigned"}
            {node.priority ? ` · ${TASK_PRIORITY_LABEL[node.priority]}` : null}
            {node.children.length > 0
              ? ` · ${node.children.length} subtask${node.children.length === 1 ? "" : "s"}`
              : null}
            {ownNotes.length > 0
              ? ` · ${ownNotes.length} note${ownNotes.length === 1 ? "" : "s"}`
              : null}
            {ownAttachments.length > 0
              ? ` · ${ownAttachments.length} file${ownAttachments.length === 1 ? "" : "s"}`
              : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {canManage ? (
            <AssigneeControl
              key={node.assignee_id ?? "none"}
              taskId={node.id}
              projectId={node.project_id}
              assigneeId={node.assignee_id ?? ""}
              assigneeName={node.assignee?.fullName ?? null}
              members={members}
            />
          ) : null}

          <PriorityControl
            key={node.priority ?? "none"}
            taskId={node.id}
            projectId={node.project_id}
            priority={node.priority}
          />

          <StatusControl
            key={node.status}
            taskId={node.id}
            projectId={node.project_id}
            status={node.status}
          />

          <div className="flex items-center">
            {canManage ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => open("edit")}
                aria-label={`Edit ${node.title}`}
                title="Edit task"
              >
                <Pencil />
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => open("attach")}
              aria-label={`Attach a file to ${node.title}`}
              title="Attach file"
            >
              <Paperclip />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => open("note")}
              aria-label={`Add note to ${node.title}`}
              title="Add note"
            >
              <MessageSquarePlus />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => open("subtask")}
              aria-label={`Add subtask to ${node.title}`}
              title="Add subtask"
            >
              <ListPlus />
            </Button>
            {canManage ? (
              <form action={deleteTask}>
                <input type="hidden" name="taskId" value={node.id} />
                <input type="hidden" name="projectId" value={node.project_id} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`Delete ${node.title}`}
                  title="Delete task"
                >
                  <Trash2 />
                </Button>
              </form>
            ) : null}
          </div>
        </div>
      </div>

      {expanded ? (
        <div
          className="flex flex-col gap-4 pb-4 pr-2"
          style={{ paddingLeft: `${12 + indentLevel * 24 + 36}px` }}
        >
          {openForm === "edit" && canManage ? (
            <EditTaskForm
              node={node}
              members={members}
              canManage={canManage}
              onClose={() => setOpenForm(null)}
            />
          ) : null}

          {/* Notes only surface when there are notes or the note form is open,
              so opening another form doesn't drag the notes block in too. */}
          {ownNotes.length > 0 || openForm === "note" ? (
            <div className="flex flex-col gap-2">
              {ownNotes.length > 0 ? (
                <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                  Notes
                </div>
              ) : null}
              <NotesList
                projectId={node.project_id}
                taskId={node.id}
                notes={ownNotes}
                currentUserId={currentUserId}
                canManage={canManage}
                showForm={openForm === "note"}
                onShowFormChange={(show) => setOpenForm(show ? "note" : null)}
              />
            </div>
          ) : null}

          {/* Attachments surface when files exist or the attach form is open. */}
          {ownAttachments.length > 0 || openForm === "attach" ? (
            <TaskAttachments
              projectId={node.project_id}
              taskId={node.id}
              attachments={ownAttachments}
              canManage={canManage}
              showForm={openForm === "attach"}
              onShowFormChange={(show) => setOpenForm(show ? "attach" : null)}
            />
          ) : null}

          {openForm === "subtask" ? (
            <NewSubtaskForm
              projectId={node.project_id}
              parentId={node.id}
              members={members}
              canManage={canManage}
              onClose={() => setOpenForm(null)}
            />
          ) : null}

          {/* Plain chevron-expand with nothing else open: gentle empty hint. */}
          {ownNotes.length === 0 &&
          ownAttachments.length === 0 &&
          openForm === null ? (
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Nothing here yet. Use the icons above to edit, attach a file, add a
              note, or add a subtask.
            </p>
          ) : null}
        </div>
      ) : null}

      {node.children.length > 0 ? (
        <SortableContext
          items={node.children.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul>
            {node.children.map((c) => (
              <TaskNode
                key={c.id}
                node={c}
                members={members}
                notesByTaskId={notesByTaskId}
                attachmentsByTaskId={attachmentsByTaskId}
                canManage={canManage}
                currentUserId={currentUserId}
              />
            ))}
          </ul>
        </SortableContext>
      ) : null}
    </li>
  );
}

/**
 * Status as a colored icon that opens a popover menu. Each option is a submit
 * button carrying its own `name="status"` value, so picking one posts directly
 * to `updateTaskStatus` with no client value state to keep in sync. The
 * `key={status}` on the call site remounts this when the server value changes
 * (e.g. another user edits), which also closes the menu after a pick.
 */
function StatusControl({
  taskId,
  projectId,
  status,
}: {
  taskId: string;
  projectId: string;
  status: TaskStatus;
}) {
  const Current = STATUS_META[status].Icon;

  return (
    <Popover
      align="end"
      triggerLabel={`Status: ${TASK_STATUS_LABEL[status]}`}
      triggerClassName="grid size-8 shrink-0 place-items-center rounded-md hover:bg-[var(--color-accent)]"
      trigger={<Current className={`size-4 ${STATUS_META[status].className}`} />}
    >
      <form action={updateTaskStatus} className="contents">
        <input type="hidden" name="taskId" value={taskId} />
        <input type="hidden" name="projectId" value={projectId} />
        {(Object.keys(STATUS_META) as TaskStatus[]).map((value) => {
          const { Icon, className } = STATUS_META[value];
          const selected = value === status;
          return (
            <button
              key={value}
              type="submit"
              name="status"
              value={value}
              role="menuitemradio"
              aria-checked={selected}
              className={MENU_ITEM}
            >
              <Icon className={`size-4 shrink-0 ${className}`} />
              <span className="flex-1">{TASK_STATUS_LABEL[value]}</span>
              {selected ? <Check className="size-4 shrink-0" /> : null}
            </button>
          );
        })}
      </form>
    </Popover>
  );
}

/**
 * Priority as a signal-strength icon (or a neutral gauge when unset), opening a
 * popover to pick Low / Medium / High or clear it. Same submit-button-per-option
 * pattern as StatusControl; "" clears the priority. Any project member can set
 * it, matching the task-update RLS policy.
 */
function PriorityControl({
  taskId,
  projectId,
  priority,
}: {
  taskId: string;
  projectId: string;
  priority: TaskPriority | null;
}) {
  const current = priority ? PRIORITY_META[priority] : null;

  return (
    <Popover
      align="end"
      triggerLabel={
        priority ? `Priority: ${TASK_PRIORITY_LABEL[priority]}` : "Priority: not set"
      }
      triggerClassName="grid size-8 shrink-0 place-items-center rounded-md hover:bg-[var(--color-accent)]"
      trigger={
        current ? (
          <current.Icon className={`size-4 ${current.className}`} />
        ) : (
          <Gauge className="size-4 text-[var(--color-muted-foreground)]" />
        )
      }
    >
      <form action={updateTaskPriority} className="contents">
        <input type="hidden" name="taskId" value={taskId} />
        <input type="hidden" name="projectId" value={projectId} />
        <button
          type="submit"
          name="priority"
          value=""
          role="menuitemradio"
          aria-checked={!priority}
          className={MENU_ITEM}
        >
          <Gauge className="size-4 shrink-0 text-[var(--color-muted-foreground)]" />
          <span className="flex-1 text-[var(--color-muted-foreground)]">
            Not set
          </span>
          {!priority ? <Check className="size-4 shrink-0" /> : null}
        </button>
        {TASK_PRIORITY_OPTIONS.map((value) => {
          const { Icon, className } = PRIORITY_META[value];
          const selected = value === priority;
          return (
            <button
              key={value}
              type="submit"
              name="priority"
              value={value}
              role="menuitemradio"
              aria-checked={selected}
              className={MENU_ITEM}
            >
              <Icon className={`size-4 shrink-0 ${className}`} />
              <span className="flex-1">{TASK_PRIORITY_LABEL[value]}</span>
              {selected ? <Check className="size-4 shrink-0" /> : null}
            </button>
          );
        })}
      </form>
    </Popover>
  );
}

/**
 * Assignee as an avatar (initials) or an add-person icon when unassigned,
 * opening a popover of members. Same submit-button-per-option approach as
 * StatusControl; "" posts as Unassigned.
 */
function AssigneeControl({
  taskId,
  projectId,
  assigneeId,
  assigneeName,
  members,
}: {
  taskId: string;
  projectId: string;
  assigneeId: string;
  assigneeName: string | null;
  members: ProjectMember[];
}) {
  const assigned = assigneeId !== "";

  return (
    <Popover
      align="end"
      triggerLabel={assigned ? `Assigned to ${assigneeName ?? "member"}` : "Unassigned"}
      triggerClassName="grid size-8 shrink-0 place-items-center rounded-md hover:bg-[var(--color-accent)]"
      trigger={
        assigned ? (
          <span className="grid size-6 place-items-center rounded-full bg-[var(--color-primary)] text-[10px] font-semibold text-[var(--color-primary-foreground)]">
            {initials(assigneeName)}
          </span>
        ) : (
          <UserRoundPlus className="size-4 text-[var(--color-muted-foreground)]" />
        )
      }
    >
      <form action={updateTaskAssignee} className="contents">
        <input type="hidden" name="taskId" value={taskId} />
        <input type="hidden" name="projectId" value={projectId} />
        <button
          type="submit"
          name="assigneeId"
          value=""
          role="menuitemradio"
          aria-checked={!assigned}
          className={MENU_ITEM}
        >
          <span className="grid size-5 shrink-0 place-items-center rounded-full border border-dashed border-[var(--color-border)]" />
          <span className="flex-1 text-[var(--color-muted-foreground)]">
            Unassigned
          </span>
          {!assigned ? <Check className="size-4 shrink-0" /> : null}
        </button>
        {members.map((m) => {
          const name = m.fullName ?? m.userId.slice(0, 8);
          const selected = m.userId === assigneeId;
          return (
            <button
              key={m.userId}
              type="submit"
              name="assigneeId"
              value={m.userId}
              role="menuitemradio"
              aria-checked={selected}
              className={MENU_ITEM}
            >
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--color-muted)] text-[10px] font-semibold">
                {initials(name)}
              </span>
              <span className="flex-1 truncate">{name}</span>
              {selected ? <Check className="size-4 shrink-0" /> : null}
            </button>
          );
        })}
      </form>
    </Popover>
  );
}

/**
 * Inline full-edit form for a task's core fields (title, assignee, status,
 * priority, due date). Posts to `updateTask`; closes on success.
 */
function EditTaskForm({
  node,
  members,
  canManage,
  onClose,
}: {
  node: TaskNodeData;
  members: ProjectMember[];
  canManage: boolean;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateTask, INITIAL);

  React.useEffect(() => {
    if (state.ok) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-md border border-[var(--color-border)] p-3"
    >
      <input type="hidden" name="taskId" value={node.id} />
      <input type="hidden" name="projectId" value={node.project_id} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`edit-title-${node.id}`} className="text-xs">
          Task title
        </Label>
        <Input
          id={`edit-title-${node.id}`}
          name="title"
          required
          maxLength={200}
          defaultValue={node.title}
        />
        {state.fieldErrors?.title ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {state.fieldErrors.title}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {canManage ? (
          <SelectNative
            name="assigneeId"
            defaultValue={node.assignee_id ?? ""}
            className="text-xs"
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.fullName ?? m.userId.slice(0, 8)}
              </option>
            ))}
          </SelectNative>
        ) : null}
        <SelectNative
          name="status"
          defaultValue={node.status}
          className="text-xs"
        >
          <option value="todo">To do</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
        </SelectNative>
        <SelectNative
          name="priority"
          defaultValue={node.priority ?? ""}
          className="text-xs"
        >
          <option value="">Priority: not set</option>
          {TASK_PRIORITY_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {TASK_PRIORITY_LABEL[value]}
            </option>
          ))}
        </SelectNative>
        <Input
          name="dueDate"
          type="date"
          className="text-xs"
          defaultValue={node.due_date ?? ""}
        />
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
          Save changes
        </Button>
      </div>
    </form>
  );
}

/**
 * Files attached to a single task: a list of downloadable files plus an upload
 * form. Uploads post to the shared `uploadFile` action with a `taskId`, so the
 * row lands against this task instead of the project's Documents card.
 */
function TaskAttachments({
  projectId,
  taskId,
  attachments,
  canManage,
  showForm,
  onShowFormChange,
}: {
  projectId: string;
  taskId: string;
  attachments: ProjectDocument[];
  canManage: boolean;
  showForm: boolean;
  onShowFormChange: (show: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(uploadFile, INITIAL_DOC);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onShowFormChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <div className="flex flex-col gap-2">
      {attachments.length > 0 ? (
        <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
          Files
        </div>
      ) : null}

      {attachments.length > 0 ? (
        <ul className="flex flex-col divide-y divide-[var(--color-border)] rounded-md border border-[var(--color-border)]">
          {attachments.map((d) => {
            const href = `/api/documents/${d.id}/download`;
            return (
              <li key={d.id} className="flex items-center gap-3 px-3 py-2">
                <FileText className="size-4 shrink-0 text-[var(--color-muted-foreground)]" />
                <div className="min-w-0 flex-1">
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm font-medium underline-offset-4 hover:underline"
                  >
                    {d.name}
                  </a>
                  <div className="text-xs text-[var(--color-muted-foreground)]">
                    {d.mime_type ?? "file"} ·{" "}
                    {d.size_bytes ? formatBytes(d.size_bytes) : "—"} · Added{" "}
                    {formatDate(d.created_at)}
                  </div>
                </div>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`Open ${d.name}`}
                >
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    <ExternalLink />
                  </a>
                </Button>
                {canManage ? (
                  <form action={deleteDocument}>
                    <input type="hidden" name="documentId" value={d.id} />
                    <input type="hidden" name="projectId" value={projectId} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`Delete ${d.name}`}
                    >
                      <Trash2 />
                    </Button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {showForm ? (
        <form
          ref={formRef}
          action={formAction}
          className="flex flex-col gap-3 rounded-md border border-[var(--color-border)] p-3"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="taskId" value={taskId} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`attach-file-${taskId}`} className="text-xs">
              Attach file
            </Label>
            <Input id={`attach-file-${taskId}`} name="file" type="file" required />
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Max 50MB. Stored privately; access controlled by project membership.
            </p>
          </div>

          {state.message && !state.ok ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {state.message}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onShowFormChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              <Upload />
              Upload
            </Button>
          </div>
        </form>
      ) : null}
    </div>
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        <SelectNative name="priority" defaultValue="" className="text-xs">
          <option value="">Priority: not set</option>
          {TASK_PRIORITY_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {TASK_PRIORITY_LABEL[value]}
            </option>
          ))}
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
