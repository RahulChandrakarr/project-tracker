import { Suspense } from "react";

import { CategoryFilter } from "@/components/projects/category-filter";
import { ProjectsTable } from "@/components/projects/projects-table";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { listProjects, matchesCategory } from "@/lib/projects/queries";
import { listCategories } from "@/lib/categories/queries";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  const [projects, categories] = await Promise.all([
    listProjects(),
    listCategories(),
  ]);

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  const filtered = projects.filter((p) => matchesCategory(p, category));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Every client project, sortable and filterable.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Suspense fallback={null}>
            <CategoryFilter categories={categories} value={category ?? ""} />
          </Suspense>
          <Suspense fallback={null}>
            <NewProjectDialog categories={categories} />
          </Suspense>
        </div>
      </div>

      <ProjectsTable projects={filtered} categoryNameById={categoryNameById} />
    </div>
  );
}
