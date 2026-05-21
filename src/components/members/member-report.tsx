import Link from "next/link";

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

import { ProductivityChart } from "./productivity-chart";

export function MemberReport({ report }: { report: MemberReportData }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Projects"
          value={report.projectsInvolved}
          hint={`${report.projectCount} with assigned tasks`}
        />
        <StatCard
          label="Tasks assigned"
          value={report.totalAssigned}
          hint={`${report.completionRate}% completion rate`}
        />
        <StatCard
          label="Completed"
          value={report.completed}
          hint={`${report.completedThisWeek} this week`}
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
        <StatCard
          label="Done this month"
          value={report.completedThisMonth}
          hint={`${report.completedThisWeek} in the last week`}
        />
        <StatCard
          label="Avg. completion"
          value={
            report.avgCompletionDays === null
              ? "—"
              : `${report.avgCompletionDays}d`
          }
          hint="From created to done"
        />
        <StatCard
          label="On-time rate"
          value={report.onTimeRate === null ? "—" : `${report.onTimeRate}%`}
          hint="Tasks done by their due date"
        />
      </div>

      <TaskBreakdown report={report} />

      <ProductivityChart series={report.series} />

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

function TaskBreakdown({ report }: { report: MemberReportData }) {
  const total = report.totalAssigned;
  const pct = (n: number) => (total === 0 ? 0 : (n / total) * 100);

  const segments = [
    { label: "Done", value: report.completed, className: "bg-[var(--color-primary)]" },
    {
      label: "In progress",
      value: report.inProgress,
      className: "bg-[var(--color-primary)]/55",
    },
    {
      label: "To do",
      value: report.todo,
      className: "bg-[var(--color-primary)]/20",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <CardTitle>Task breakdown</CardTitle>
            <CardDescription>How the assigned work splits by status.</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold tabular-nums">
              {report.completionRate}%
            </div>
            <div className="text-xs text-[var(--color-muted-foreground)]">
              completion rate
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--color-secondary)]">
          {total === 0
            ? null
            : segments.map((s) =>
                s.value === 0 ? null : (
                  <div
                    key={s.label}
                    className={s.className}
                    style={{ width: `${pct(s.value)}%` }}
                    title={`${s.label}: ${s.value}`}
                  />
                ),
              )}
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs">
          {segments.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5">
              <span className={`size-2.5 rounded-sm ${s.className}`} />
              <span className="text-[var(--color-muted-foreground)]">
                {s.label}
              </span>
              <span className="font-medium tabular-nums">{s.value}</span>
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
