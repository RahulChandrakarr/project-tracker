import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditProjectDialog } from "@/components/projects/edit-project-dialog";
import { MembersCard } from "@/components/projects/members-card";
import { ProgressEditor } from "@/components/projects/progress-editor";
import { ProjectDocumentsCard } from "@/components/projects/project-documents-card";
import { ProjectNotesCard } from "@/components/projects/project-notes-card";
import { TasksCard } from "@/components/projects/tasks-card";
import { getCurrentUser, getProjectRole } from "@/lib/auth/current-user";
import { getProjectById } from "@/lib/projects/queries";
import { listCategories } from "@/lib/categories/queries";
import {
  listAssignableUsers,
  listProjectMembers,
} from "@/lib/members/queries";
import { listProjectTasks, buildTaskTree } from "@/lib/tasks/queries";
import { listProjectDocuments } from "@/lib/documents/queries";
import { listProjectNotes, partitionNotes } from "@/lib/notes/queries";
import { formatDate } from "@/lib/format";
import { PRIORITY_LABEL } from "@/types/project";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await getProjectById(id);
  if (!project) notFound();

  const [
    me,
    projectRole,
    members,
    assignable,
    tasks,
    documents,
    categories,
    allNotes,
  ] = await Promise.all([
    getCurrentUser(),
    getProjectRole(id),
    listProjectMembers(id),
    listAssignableUsers(id),
    listProjectTasks(id),
    listProjectDocuments(id),
    listCategories(),
    listProjectNotes(id),
  ]);

  const canManage =
    me.role === "admin" || projectRole?.role === "admin" || false;

  const tree = buildTaskTree(tasks);
  const { project: projectNotes, byTaskId: notesByTaskId } =
    partitionNotes(allNotes);

  const category = project.category_id
    ? categories.find((c) => c.id === project.category_id)
    : null;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href="/projects">
            <ChevronLeft />
            All projects
          </Link>
        </Button>

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {project.name}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {project.client}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {category ? (
              <Badge variant="outline">{category.name}</Badge>
            ) : null}
            <span className="text-[var(--color-muted-foreground)]">
              {PRIORITY_LABEL[project.priority]} priority
            </span>
            <span className="text-[var(--color-muted-foreground)]">
              Due {formatDate(project.deadline)}
            </span>
            {canManage ? (
              <EditProjectDialog project={project} categories={categories} />
            ) : null}
          </div>
        </div>

        <ProgressEditor
          projectId={project.id}
          progress={project.progress}
          status={project.status}
          canEdit={canManage}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <TasksCard
            projectId={project.id}
            tree={tree}
            members={members}
            notesByTaskId={notesByTaskId}
            canManage={canManage}
            currentUserId={me.id}
          />

          <ProjectDocumentsCard
            projectId={project.id}
            documents={documents}
            canManage={canManage}
          />
        </div>

        <div className="flex flex-col gap-6">
          <MembersCard
            projectId={project.id}
            members={members}
            assignableUsers={assignable}
            canManage={canManage}
            currentUserId={me.id}
          />

          <ProjectNotesCard
            projectId={project.id}
            notes={projectNotes}
            currentUserId={me.id}
            canManage={canManage}
          />
        </div>
      </div>
    </div>
  );
}
