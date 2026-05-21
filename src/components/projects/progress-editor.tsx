"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import {
  updateProjectProgress,
  updateProjectStatus,
} from "@/lib/projects/mutations";

import { ProgressBar } from "./progress-bar";
import { StatusBadge } from "./status-badge";
import type { ProjectStatus } from "@/types/project";

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
  if (!canEdit) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <ProgressBar value={progress} className="max-w-md min-w-[200px]" />
        <span className="text-xs tabular-nums text-[var(--color-muted-foreground)]">
          {progress}%
        </span>
        <StatusBadge status={status} />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <ProgressBar value={progress} className="max-w-md min-w-[200px]" />
      <ProgressInput key={progress} projectId={projectId} progress={progress} />
      <ProjectStatusSelect key={status} projectId={projectId} status={status} />
    </div>
  );
}

/**
 * Controlled so React 19's automatic <form action> reset can't revert the
 * field to its old value after submit. `key` at the call site re-seeds it
 * when the server value changes.
 */
function ProgressInput({
  projectId,
  progress,
}: {
  projectId: string;
  progress: number;
}) {
  const [value, setValue] = React.useState(String(progress));

  return (
    <form action={updateProjectProgress} className="flex items-center gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <Input
        name="progress"
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        className="h-8 w-20 text-xs tabular-nums"
        onBlur={(e) => {
          const val = Number(e.currentTarget.value);
          if (!Number.isNaN(val) && val >= 0 && val <= 100 && val !== progress) {
            e.currentTarget.form?.requestSubmit();
          } else if (Number.isNaN(val) || val < 0 || val > 100) {
            setValue(String(progress));
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
      />
      <span className="text-xs text-[var(--color-muted-foreground)]">%</span>
    </form>
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
