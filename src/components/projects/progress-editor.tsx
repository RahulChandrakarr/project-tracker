"use client";

import * as React from "react";

import { SelectNative } from "@/components/ui/select-native";
import { updateProjectStatus } from "@/lib/projects/mutations";

import { ProgressBar } from "./progress-bar";
import { StatusBadge } from "./status-badge";
import type { ProjectStatus } from "@/types/project";

/**
 * Progress is derived from task completion (see migration 0008), so it's shown
 * read-only here. Project admins can still change the status.
 */
export function ProgressEditor({
  projectId,
  progress,
  status,
  canEdit,
}: {
  projectId: string;
  progress: number;
  status: ProjectStatus;
  canEdit: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-3">
        <ProgressBar value={progress} className="max-w-md min-w-[200px]" />
        <span
          className="text-xs tabular-nums text-[var(--color-muted-foreground)]"
          title="Calculated from completed tasks"
        >
          {progress}%
        </span>
        {canEdit ? (
          <ProjectStatusSelect key={status} projectId={projectId} status={status} />
        ) : (
          <StatusBadge status={status} />
        )}
      </div>
      <p className="text-xs text-[var(--color-muted-foreground)]">
        Auto-calculated from completed tasks.
      </p>
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
