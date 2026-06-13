import { CollapsibleCard } from "@/components/ui/collapsible-card";
import type { MemberMetric } from "@/lib/tasks/queries";

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Per-member workload bars: each bar's length scales with how many tasks a
 * member is assigned (relative to the busiest member), split into a completed
 * (green) and remaining (amber) segment. Speed and high-priority load sit
 * alongside as text. Sits in the right-hand column with Notes and Documents.
 */
export function MemberMetricsCard({
  metrics,
  defaultOpen,
}: {
  metrics: MemberMetric[];
  defaultOpen: boolean;
}) {
  const totalAssigned = metrics.reduce((n, m) => n + m.assigned, 0);
  const totalOpen = metrics.reduce((n, m) => n + m.open, 0);
  const maxAssigned = Math.max(1, ...metrics.map((m) => m.assigned));

  return (
    <CollapsibleCard
      title="Team metrics"
      badge={metrics.length > 0 ? metrics.length : undefined}
      defaultOpen={defaultOpen}
      description={
        metrics.length > 0
          ? `${totalAssigned} assigned task${totalAssigned === 1 ? "" : "s"} · ${totalOpen} still open`
          : "Workload and completion speed per member."
      }
      contentClassName="flex flex-col gap-5"
    >
      {metrics.length === 0 ? (
        <p className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
          No assigned tasks yet. Assign tasks to members to see workload here.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {metrics.map((m) => {
              const name = m.fullName ?? m.userId.slice(0, 8);
              const donePct =
                m.assigned > 0 ? (m.done / m.assigned) * 100 : 0;
              return (
                <li key={m.userId} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--color-muted)] text-[10px] font-semibold">
                        {initials(m.fullName)}
                      </span>
                      <span className="truncate font-medium">{name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-[var(--color-muted-foreground)]">
                      {m.done}/{m.assigned} done
                      {m.avgCompletionDays !== null
                        ? ` · ~${m.avgCompletionDays.toFixed(1)}d avg`
                        : ""}
                    </span>
                  </div>

                  <div
                    className="h-2.5 w-full rounded-full bg-[var(--color-muted)]"
                    title={`${m.assigned} assigned, ${m.done} done, ${m.open} open`}
                  >
                    <div
                      className="flex h-full overflow-hidden rounded-full"
                      style={{ width: `${(m.assigned / maxAssigned) * 100}%` }}
                    >
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${donePct}%` }}
                      />
                      <div className="h-full flex-1 bg-amber-400" />
                    </div>
                  </div>

                  {m.highPriorityOpen > 0 ? (
                    <span className="text-xs text-rose-500">
                      {m.highPriorityOpen} high-priority open
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-4 text-xs text-[var(--color-muted-foreground)]">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-500" /> Completed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-amber-400" /> Open
            </span>
            <span className="ml-auto">Bar length = total workload</span>
          </div>
        </>
      )}
    </CollapsibleCard>
  );
}
