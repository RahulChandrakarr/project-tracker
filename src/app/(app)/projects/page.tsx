import { Suspense } from "react";

import { ProjectsTable } from "@/components/projects/projects-table";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { listProjects } from "@/lib/projects/queries";
import { listCategories } from "@/lib/categories/queries";

export default async function ProjectsPage() {
  const [projects, categories] = await Promise.all([
    listProjects(),
    listCategories(),
  ]);

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Every client project, sortable and filterable.
          </p>
        </div>
        <Suspense fallback={null}>
          <NewProjectDialog categories={categories} />
        </Suspense>
      </div>

      <ProjectsTable
        projects={projects}
        categoryNameById={categoryNameById}
      />
    </div>
  );
}
