import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CategoryFilter } from "@/components/projects/category-filter";
import {
  PageMotion,
  PageMotionItem,
  PageMotionSection,
} from "@/components/layout/page-motion";
import { DashboardTasksTable } from "@/components/projects/dashboard-tasks-table";
import { ProjectsTable } from "@/components/projects/projects-table";
import { StatCard } from "@/components/projects/stat-card";
import { AttendanceControl } from "@/components/calendar/attendance-control";
import { listProjects, matchesCategory } from "@/lib/projects/queries";
import { listCategories } from "@/lib/categories/queries";
import {
  listOpenTasks,
  listRecentlyCompletedTasks,
} from "@/lib/tasks/queries";
import { getMyAttendance } from "@/lib/calendar/queries";
import { todayDateKey } from "@/lib/calendar/dates";
import { getCurrentUser } from "@/lib/auth/current-user";
import { daysUntil } from "@/lib/format";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  const [allProjects, categories, openTasks, completedTasks, me, todayAttendance] =
    await Promise.all([
      listProjects(),
      listCategories(),
      listOpenTasks(),
      listRecentlyCompletedTasks(),
      getCurrentUser(),
      getMyAttendance(todayDateKey()),
    ]);

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  const projects = allProjects.filter((p) => matchesCategory(p, category));

  const total = projects.length;
  const active = projects.filter((p) => p.status === "in_progress").length;
  const blocked = projects.filter((p) => p.status === "blocked").length;
  const dueSoon = projects.filter((p) => {
    const days = daysUntil(p.deadline);
    return days !== null && days <= 14 && p.status !== "done";
  }).length;

  const recent = projects.slice(0, 5);

  return (
    <PageMotion>
      <PageMotionItem className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Snapshot of active client work and what needs attention.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Suspense fallback={null}>
            <CategoryFilter categories={categories} value={category ?? ""} />
          </Suspense>
          <Button variant="outline" size="sm" asChild>
            <Link href="/projects">
              View all projects
              <ArrowUpRight />
            </Link>
          </Button>
        </div>
      </PageMotionItem>

      <PageMotionItem>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
          <div className="mr-auto">
            <p className="text-sm font-medium">Today&apos;s attendance</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Mark where you are today. No entry counts as absent.
            </p>
          </div>
          <AttendanceControl
            key={`dash-today-${todayAttendance ?? "none"}`}
            userId={me.id}
            date={todayDateKey()}
            defaultStatus={todayAttendance}
            canEdit
            compact
          />
        </div>
      </PageMotionItem>

      <PageMotionSection className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total projects", value: total },
          { label: "In progress", value: active, hint: "Active client work" },
          { label: "Blocked", value: blocked, hint: "Needs unblocking" },
          {
            label: "Due in 14 days",
            value: dueSoon,
            hint: "Watch the deadline",
          },
        ].map((stat, index) => (
          <PageMotionItem key={stat.label} delay={index * 0.04}>
            <StatCard {...stat} />
          </PageMotionItem>
        ))}
      </PageMotionSection>

      <PageMotionSection className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <h2 className="text-base font-semibold tracking-tight">
            Recently updated
          </h2>
        </div>
        <ProjectsTable projects={recent} categoryNameById={categoryNameById} />
      </PageMotionSection>

      <PageMotionItem className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PageMotionSection className="flex flex-col gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Open tasks
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Not done yet, soonest deadline first.
            </p>
          </div>
          <DashboardTasksTable
            tasks={openTasks}
            variant="open"
            emptyMessage="No open tasks. Everything's done."
          />
        </PageMotionSection>

        <PageMotionSection className="flex flex-col gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Recently completed
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Marked done most recently.
            </p>
          </div>
          <DashboardTasksTable
            tasks={completedTasks}
            variant="completed"
            emptyMessage="Nothing completed yet."
          />
        </PageMotionSection>
      </PageMotionItem>
    </PageMotion>
  );
}
