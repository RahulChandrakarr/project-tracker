import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { Project } from "@/lib/projects/queries";
import { PRIORITY_LABEL } from "@/types/project";

import { StatusBadge } from "./status-badge";

export function ProjectsTable({
  projects,
  categoryNameById,
}: {
  projects: Project[];
  categoryNameById?: Map<string, string>;
}) {
  if (projects.length === 0) {
    return (
      <div className="grid h-48 place-items-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-card)] text-sm text-[var(--color-muted-foreground)]">
        No projects yet. Create your first to get started.
      </div>
    );
  }

  return (
    <>
      {/* Mobile: stacked cards (the table has too many columns for small screens). */}
      <ul className="flex flex-col gap-3 md:hidden">
        {projects.map((p) => {
          const categoryName = p.category_id
            ? categoryNameById?.get(p.category_id)
            : null;
          return (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="truncate text-xs text-[var(--color-muted-foreground)]">
                      {p.client}
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted-foreground)]">
                  {categoryName ? (
                    <Badge variant="outline">{categoryName}</Badge>
                  ) : null}
                  <span>{PRIORITY_LABEL[p.priority]} priority</span>
                  <span>Due {formatDate(p.deadline)}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* md+ : full table */}
      <div className="hidden overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] md:block">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Deadline</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/projects/${p.id}`}
                  className="underline-offset-4 hover:underline"
                >
                  {p.name}
                </Link>
              </TableCell>
              <TableCell className="text-[var(--color-muted-foreground)]">
                {p.client}
              </TableCell>
              <TableCell>
                {p.category_id && categoryNameById?.get(p.category_id) ? (
                  <Badge variant="outline">
                    {categoryNameById.get(p.category_id)}
                  </Badge>
                ) : (
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    —
                  </span>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge status={p.status} />
              </TableCell>
              <TableCell className="text-[var(--color-muted-foreground)]">
                {PRIORITY_LABEL[p.priority]}
              </TableCell>
              <TableCell className="text-[var(--color-muted-foreground)]">
                {formatDate(p.deadline)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </>
  );
}
