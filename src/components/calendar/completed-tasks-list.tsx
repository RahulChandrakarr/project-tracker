import Link from "next/link";

import type { CalendarCompletedTask } from "@/lib/calendar/queries";
import { formatDateTime } from "@/lib/format";

export function CompletedTasksList({
  tasks,
}: {
  tasks: CalendarCompletedTask[];
}) {
  if (tasks.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted-foreground)]">
        No tasks completed on this day. Mark tasks done in any project to see
        them here automatically.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-[var(--color-border)] rounded-md border border-[var(--color-border)]">
      {tasks.map((task) => (
        <li key={task.id} className="flex flex-col gap-1 px-4 py-3">
          <Link
            href={`/projects/${task.projectId}`}
            className="text-sm font-medium hover:underline"
          >
            {task.title}
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
            {task.projectName ? <span>{task.projectName}</span> : null}
            <span aria-hidden>·</span>
            <time dateTime={task.completedAt}>
              {formatDateTime(task.completedAt)}
            </time>
          </div>
        </li>
      ))}
    </ul>
  );
}
