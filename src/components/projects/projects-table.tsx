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

import { ProgressBar } from "./progress-bar";
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
    <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead className="w-[160px]">Progress</TableHead>
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
              <TableCell>
                <div className="flex items-center gap-2">
                  <ProgressBar value={p.progress} className="w-24" />
                  <span className="w-9 text-right text-xs tabular-nums text-[var(--color-muted-foreground)]">
                    {p.progress}%
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-[var(--color-muted-foreground)]">
                {formatDate(p.deadline)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
