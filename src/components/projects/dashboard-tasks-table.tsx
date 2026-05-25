"use client";

import Link from "next/link";
import {
  Check,
  Circle,
  CircleCheck,
  CircleDot,
  type LucideIcon,
} from "lucide-react";

import { Popover } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { updateTaskStatus } from "@/lib/tasks/mutations";
import type { DashboardTask } from "@/lib/tasks/queries";
import { formatDate } from "@/lib/format";
import { TASK_STATUS_LABEL, type TaskStatus } from "@/types/project";

const MENU_ITEM =
  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)] focus-visible:bg-[var(--color-accent)] focus-visible:text-[var(--color-accent-foreground)] focus-visible:outline-none";

const STATUS_META = {
  todo: { Icon: Circle, className: "text-[var(--color-muted-foreground)]" },
  in_progress: { Icon: CircleDot, className: "text-amber-500" },
  done: { Icon: CircleCheck, className: "text-emerald-500" },
} satisfies Record<TaskStatus, { Icon: LucideIcon; className: string }>;

/**
 * A compact, cross-project task table for the dashboard. `variant` decides
 * which date is shown ("open" = due date, "completed" = completion date). Each
 * row links to its project and exposes the same status menu used in the task
 * tree, so status can be changed without leaving the dashboard.
 */
export function DashboardTasksTable({
  tasks,
  variant,
  emptyMessage,
}: {
  tasks: DashboardTask[];
  variant: "open" | "completed";
  emptyMessage: string;
}) {
  if (tasks.length === 0) {
    return (
      <div className="grid h-32 place-items-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-card)] px-4 text-center text-sm text-[var(--color-muted-foreground)]">
        {emptyMessage}
      </div>
    );
  }

  const dateLabel = variant === "completed" ? "Completed" : "Due";

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>{dateLabel}</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((t) => {
            const date = variant === "completed" ? t.completed_at : t.due_date;
            return (
              <TableRow key={t.id}>
                <TableCell>
                  <div className="min-w-0">
                    <div className="font-medium">{t.title}</div>
                    {t.project ? (
                      <Link
                        href={`/projects/${t.project.id}`}
                        className="block truncate text-xs text-[var(--color-muted-foreground)] underline-offset-4 hover:text-[var(--color-foreground)] hover:underline"
                      >
                        {t.project.name}
                      </Link>
                    ) : (
                      <span className="text-xs text-[var(--color-muted-foreground)]">
                        Unknown project
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-[var(--color-muted-foreground)]">
                  {formatDate(date)}
                </TableCell>
                <TableCell className="text-right">
                  <TaskStatusControl
                    key={t.status}
                    taskId={t.id}
                    projectId={t.project_id}
                    status={t.status}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Status as a colored icon opening a popover menu, identical in behaviour to
 * the task tree's control: each option is a submit button posting directly to
 * `updateTaskStatus` (which revalidates "/"), and `key={status}` at the call
 * site remounts this on change, closing the menu after a pick.
 */
function TaskStatusControl({
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
      triggerClassName="ml-auto grid size-8 shrink-0 place-items-center rounded-md hover:bg-[var(--color-accent)]"
      trigger={
        <Current className={`size-4 ${STATUS_META[status].className}`} />
      }
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
