import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CategoryFilter } from "@/components/projects/category-filter";
import { ProjectsTable } from "@/components/projects/projects-table";
import { StatCard } from "@/components/projects/stat-card";
import { listProjects, matchesCategory } from "@/lib/projects/queries";
import { listCategories } from "@/lib/categories/queries";
import { daysUntil } from "@/lib/format";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  const [allProjects, categories] = await Promise.all([
    listProjects(),
    listCategories(),
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
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total projects" value={total} />
        <StatCard label="In progress" value={active} hint="Active client work" />
        <StatCard label="Blocked" value={blocked} hint="Needs unblocking" />
        <StatCard
          label="Due in 14 days"
          value={dueSoon}
          hint="Watch the deadline"
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <h2 className="text-base font-semibold tracking-tight">
            Recently updated
          </h2>
        </div>
        <ProjectsTable projects={recent} categoryNameById={categoryNameById} />
      </section>
    </div>
  );
}
