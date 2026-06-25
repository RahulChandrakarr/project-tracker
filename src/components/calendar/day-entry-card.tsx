import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TASK_STATUS_LABEL } from "@/lib/calendar/status";
import type { CalendarDayEntry } from "@/lib/calendar/queries";

const MAX_VISIBLE = 3;

export function DayEntryCard({
  entry,
  compact = false,
}: {
  entry: CalendarDayEntry;
  compact?: boolean;
}) {
  const badgeLabel =
    entry.kind === "completed"
      ? (entry.projectName ?? "Completed")
      : entry.status
        ? TASK_STATUS_LABEL[entry.status]
        : "Task";

  const inner = (
    <>
      <p
        className={cn(
          "font-medium leading-snug text-[var(--color-foreground)]",
          compact ? "line-clamp-2 text-[11px]" : "line-clamp-2 text-xs",
        )}
      >
        {entry.title}
      </p>
      <Badge
        variant={entry.status === "done" ? "default" : "muted"}
        className="mt-1 w-fit text-[10px]"
      >
        {badgeLabel}
      </Badge>
      {entry.kind === "task" && entry.projectName ? (
        <p className="mt-1 line-clamp-1 text-[10px] leading-snug text-[var(--color-muted-foreground)]">
          {entry.projectName}
        </p>
      ) : null}
    </>
  );

  // Only real completed tasks deep-link to their project; manually logged
  // day tasks open the day dialog via the parent button.
  if (entry.kind === "completed" && entry.projectId) {
    return (
      <Link
        href={`/projects/${entry.projectId}`}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "block rounded border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-sm transition-colors",
          "hover:bg-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
        )}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "rounded border border-[var(--color-border)] bg-[var(--color-card)] p-1.5 shadow-sm",
      )}
    >
      {inner}
    </div>
  );
}

export function DayEntryStack({
  entries,
  onMoreClick,
}: {
  entries: CalendarDayEntry[];
  onMoreClick?: () => void;
}) {
  const visible = entries.slice(0, MAX_VISIBLE);
  const hidden = entries.length - visible.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
      {visible.map((entry) => (
        <DayEntryCard key={entry.id} entry={entry} compact />
      ))}
      {hidden > 0 ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoreClick?.();
          }}
          className="text-left text-[10px] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        >
          +{hidden} more
        </button>
      ) : null}
    </div>
  );
}
