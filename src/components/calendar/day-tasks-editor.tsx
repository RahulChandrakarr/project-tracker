"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, NotebookPen, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { NoteBody } from "@/components/projects/note-editor";
import { RichTextField } from "@/components/calendar/rich-text-field";
import { saveDayTaskEntries } from "@/lib/calendar/mutations";
import { TASK_STATUS_LABEL, TASK_STATUS_ORDER } from "@/lib/calendar/status";
import { cn } from "@/lib/utils";
import type {
  CalendarProjectOption,
  CalendarTaskEntry,
} from "@/lib/calendar/queries";
import type { TaskStatus } from "@/lib/supabase/types";

type Row = {
  key: string;
  title: string;
  status: TaskStatus;
  projectId: string | null;
  notes: string;
  notesOpen: boolean;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

let rowSeq = 0;
function newRow(): Row {
  rowSeq += 1;
  return {
    key: `row-${rowSeq}`,
    title: "",
    status: "todo",
    projectId: null,
    notes: "",
    notesOpen: true,
  };
}

function rowsFromEntries(entries: CalendarTaskEntry[]): Row[] {
  if (entries.length === 0) return [newRow()];
  return entries.map((e) => {
    rowSeq += 1;
    return {
      key: `entry-${e.id}`,
      title: e.title,
      status: e.status,
      projectId: e.projectId,
      notes: e.notes,
      notesOpen: true,
    };
  });
}

function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant={status === "done" ? "default" : "muted"}>
      {TASK_STATUS_LABEL[status]}
    </Badge>
  );
}

/**
 * Read-only view of someone else's logged day tasks.
 */
function ReadOnlyTasks({ entries }: { entries: CalendarTaskEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted-foreground)]">
        No tasks logged for this day.
      </p>
    );
  }
  return (
    <ul className="flex flex-col divide-y divide-[var(--color-border)] rounded-md border border-[var(--color-border)]">
      {entries.map((e) => (
        <li key={e.id} className="flex flex-col gap-2 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">{e.title}</span>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
              {e.projectName ? <span>{e.projectName}</span> : null}
              <StatusBadge status={e.status} />
            </div>
          </div>
          {e.notes ? <NoteBody body={e.notes} /> : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Editable multi-row task list for a single day. Add as many tasks as you
 * like, each with a status and an optional project, then Save. No autosave.
 */
export function DayTasksEditor({
  date,
  defaultEntries,
  projectOptions,
  canEdit,
}: {
  date: string;
  defaultEntries: CalendarTaskEntry[];
  projectOptions: CalendarProjectOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = React.useState<Row[]>(() =>
    rowsFromEntries(defaultEntries),
  );
  const [status, setStatus] = React.useState<SaveStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);

  if (!canEdit) {
    return <ReadOnlyTasks entries={defaultEntries} />;
  }

  function update(key: string, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
    setStatus("idle");
  }

  function addRow() {
    setRows((prev) => [...prev, newRow()]);
    setStatus("idle");
  }

  function removeRow(key: string) {
    setRows((prev) => {
      const next = prev.filter((r) => r.key !== key);
      return next.length === 0 ? [newRow()] : next;
    });
    setStatus("idle");
  }

  function toggleNotes(key: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.key === key ? { ...r, notesOpen: !r.notesOpen } : r,
      ),
    );
  }

  async function save() {
    const payload = rows
      .map((r) => ({
        title: r.title.trim(),
        status: r.status,
        projectId: r.projectId,
        notes: r.notes,
      }))
      .filter((r) => r.title.length > 0);

    setStatus("saving");
    setError(null);
    const result = await saveDayTaskEntries(date, payload);
    if (result.ok) {
      setStatus("saved");
      router.refresh();
    } else {
      setStatus("error");
      setError(result.message ?? "Could not save. Try again.");
    }
  }

  const statusLabel =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? "Saved"
        : status === "error"
          ? (error ?? "Save failed")
          : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3">
        {rows.map((row) => {
          const hasNotes = row.notes.trim().length > 0;
          return (
            <div
              key={row.key}
              className="flex flex-col gap-2 rounded-md border border-[var(--color-border)] p-2"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  value={row.title}
                  onChange={(e) => update(row.key, { title: e.target.value })}
                  placeholder="What did you work on?"
                  className="sm:flex-1"
                  aria-label="Task"
                />
                <SelectNative
                  value={row.status}
                  onChange={(e) =>
                    update(row.key, { status: e.target.value as TaskStatus })
                  }
                  className="sm:w-36"
                  aria-label="Status"
                >
                  {TASK_STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {TASK_STATUS_LABEL[s]}
                    </option>
                  ))}
                </SelectNative>
                <SelectNative
                  value={row.projectId ?? ""}
                  onChange={(e) =>
                    update(row.key, { projectId: e.target.value || null })
                  }
                  className="sm:w-44"
                  aria-label="Project (optional)"
                >
                  <option value="">No project</option>
                  {projectOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </SelectNative>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleNotes(row.key)}
                    aria-label={row.notesOpen ? "Hide notes" : "Add notes"}
                    aria-expanded={row.notesOpen}
                    className={cn(
                      "shrink-0",
                      hasNotes
                        ? "text-[var(--color-foreground)]"
                        : "text-[var(--color-muted-foreground)]",
                    )}
                    title={hasNotes ? "Notes added" : "Add notes"}
                  >
                    <NotebookPen className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(row.key)}
                    aria-label="Remove task"
                    className="shrink-0 text-[var(--color-muted-foreground)]"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              {row.notesOpen ? (
                <RichTextField
                  defaultValue={row.notes}
                  onChange={(html) => update(row.key, { notes: html })}
                  placeholder="Notes for this task — details, links, blockers…"
                />
              ) : hasNotes ? (
                <button
                  type="button"
                  onClick={() => toggleNotes(row.key)}
                  className="flex items-center gap-1 self-start text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                >
                  <ChevronDown className="size-3.5" />
                  Notes added — click to edit
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="size-4" />
          Add task
        </Button>
        <div className="flex items-center gap-3">
          {statusLabel ? (
            <p
              className={
                status === "error"
                  ? "text-xs text-[var(--color-destructive)]"
                  : "text-xs text-[var(--color-muted-foreground)]"
              }
              aria-live="polite"
            >
              {statusLabel}
            </p>
          ) : null}
          <Button
            type="button"
            size="sm"
            onClick={() => void save()}
            disabled={status === "saving"}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
