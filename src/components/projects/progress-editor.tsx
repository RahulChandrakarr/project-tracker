"use client";

import * as React from "react";

import { SelectNative } from "@/components/ui/select-native";
import { updateProjectStatus } from "@/lib/projects/mutations";

import { StatusBadge } from "./status-badge";
import type { ProjectStatus } from "@/types/project";

/**
 * Project status control. Admins can change the status; everyone else sees a
 * read-only badge. (The derived progress bar was removed.)
 */
export function ProgressEditor({
  projectId,
  status,
  canEdit,
}: {
  projectId: string;
  status: ProjectStatus;
  canEdit: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {canEdit ? (
        <ProjectStatusSelect key={status} projectId={projectId} status={status} />
      ) : (
        <StatusBadge status={status} />
      )}
    </div>
  );
}

function ProjectStatusSelect({
  projectId,
  status,
}: {
  projectId: string;
  status: ProjectStatus;
}) {
  const [value, setValue] = React.useState<ProjectStatus>(status);

  return (
    <form action={updateProjectStatus}>
      <input type="hidden" name="projectId" value={projectId} />
      <SelectNative
        name="status"
        value={value}
        className="h-8 w-36 text-xs"
        onChange={(e) => {
          setValue(e.currentTarget.value as ProjectStatus);
          e.currentTarget.form?.requestSubmit();
        }}
      >
        <option value="planning">Planning</option>
        <option value="in_progress">In progress</option>
        <option value="review">Review</option>
        <option value="blocked">Blocked</option>
        <option value="done">Done</option>
      </SelectNative>
    </form>
  );
}
