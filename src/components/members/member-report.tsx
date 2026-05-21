import Link from "next/link";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard } from "@/components/projects/stat-card";
import type { MemberReport as MemberReportData } from "@/lib/profile/queries";
import { TASK_STATUS_LABEL } from "@/types/project";
import { formatDate } from "@/lib/format";

export function MemberReport({ report }: { report: MemberReportData }) {
  const maxWeek = Math.max(1, ...report.weeks.map((w) => w.completed));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Tasks assigned"
          value={report.totalAssigned}
          hint={`Across ${report.projectCount} project${report.projectCount === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Completed"
          value={report.completed}
          hint={`${report.completionRate}% completion rate`}
        />
        <StatCard
          label="In progress"
          value={report.inProgress}
          hint={`${report.todo} still to do`}
        />
        <StatCard
          label="Overdue"
          value={report.overdue}
          hint={report.overdue === 0 ? "All on track" : "Past due date"}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Weekly productivity</CardTitle>
              <CardDescription>
                Tasks completed per week over the last {report.weeks.length}{" "}
                weeks.
              </CardDescription>
            </div>
            <GrowthBadge
              thisWeek={report.completedThisWeek}
              lastWeek={report.completedLastWeek}
              growthRate={report.growthRate}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2">
            {report.weeks.map((w) => {
              const height =
                w.completed === 0
                  ? 2
                  : Math.max(6, Math.round((w.completed / maxWeek) * 96));
              return (
                <div
                  key={w.weekStart}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <div className="text-xs font-medium tabular-nums text-[var(--color-muted-foreground)]">
                    {w.completed}
                  </div>
                  <div
                    className="w-full max-w-10 rounded-t bg-[var(--color-primary)]"
                    style={{ height: `${height}px` }}
                    title={`Week of ${w.label}: ${w.completed} completed, ${w.created} added`}
                  />
                  <div className="text-[10px] text-[var(--color-muted-foreground)]">
                    {w.label}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assigned tasks</CardTitle>
          <CardDescription>
            {report.totalAssigned === 0
              ? "No tasks assigned yet."
              : `Most recent of ${report.totalAssigned} assigned.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {report.recentTasks.length === 0 ? (
            <p className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
              Nothing here yet.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--color-border)]">
              {report.recentTasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {t.title}
                    </div>
                    <div className="text-xs text-[var(--color-muted-foreground)]">
                      {t.projectName ? (
                        <Link
                          href={`/projects/${t.projectId}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {t.projectName}
                        </Link>
                      ) : (
                        "Unknown project"
                      )}
                      {t.completedAt
                        ? ` · Done ${formatDate(t.completedAt)}`
                        : t.dueDate
                          ? ` · Due ${formatDate(t.dueDate)}`
                          : ""}
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {TASK_STATUS_LABEL[t.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GrowthBadge({
  thisWeek,
  lastWeek,
  growthRate,
}: {
  thisWeek: number;
  lastWeek: number;
  growthRate: number | null;
}) {
  const Icon =
    growthRate === null || growthRate === 0
      ? Minus
      : growthRate > 0
        ? TrendingUp
        : TrendingDown;

  const label =
    growthRate === null
      ? lastWeek === 0 && thisWeek > 0
        ? "New activity"
        : "No change"
      : `${growthRate > 0 ? "+" : ""}${growthRate}% vs last week`;

  return (
    <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm">
      <Icon className="size-4 text-[var(--color-muted-foreground)]" />
      <span className="text-[var(--color-muted-foreground)]">{label}</span>
      <span className="font-medium tabular-nums">
        {thisWeek} this week
      </span>
    </div>
  );
}
