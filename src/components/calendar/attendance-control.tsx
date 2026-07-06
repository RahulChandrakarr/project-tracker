"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { setAttendance } from "@/lib/calendar/mutations";
import {
  ATTENDANCE_STATUS_LABEL,
  ATTENDANCE_STATUS_ORDER,
  ATTENDANCE_STATUS_STYLE,
} from "@/lib/calendar/attendance";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/lib/supabase/types";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function AttendanceBadge({
  status,
  className,
}: {
  status: AttendanceStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        ATTENDANCE_STATUS_STYLE[status].badge,
        className,
      )}
    >
      <span
        className={cn("size-2 rounded-full", ATTENDANCE_STATUS_STYLE[status].dot)}
        aria-hidden
      />
      {ATTENDANCE_STATUS_LABEL[status]}
    </span>
  );
}

/**
 * Set attendance for one user on one day. Everyone can set their own; app
 * admins can set anyone's (gated server-side). `compact` drops the note field
 * for the header quick-setter. Unset defaults to Absent in the picker.
 */
export function AttendanceControl({
  userId,
  date,
  defaultStatus,
  defaultNote = "",
  canEdit,
  compact = false,
}: {
  userId: string;
  date: string;
  defaultStatus: AttendanceStatus | null;
  defaultNote?: string;
  canEdit: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = React.useState<AttendanceStatus>(
    defaultStatus ?? "absent",
  );
  const [note, setNote] = React.useState(defaultNote);
  const [save, setSave] = React.useState<SaveStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);

  if (!canEdit) {
    if (!defaultStatus) {
      return (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Not marked.
        </p>
      );
    }
    return <AttendanceBadge status={defaultStatus} />;
  }

  async function submit() {
    setSave("saving");
    setError(null);
    const result = await setAttendance(userId, date, status, note);
    if (result.ok) {
      setSave("saved");
      router.refresh();
    } else {
      setSave("error");
      setError(result.message ?? "Could not save.");
    }
  }

  const saveLabel =
    save === "saving"
      ? "Saving…"
      : save === "saved"
        ? "Saved"
        : save === "error"
          ? (error ?? "Save failed")
          : null;

  return (
    <div className={cn("flex flex-col gap-2", compact && "sm:min-w-64")}>
      <div className="flex flex-wrap items-center gap-2">
        <SelectNative
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as AttendanceStatus);
            setSave("idle");
          }}
          className={compact ? "w-44" : "sm:w-48"}
          aria-label="Attendance status"
        >
          {ATTENDANCE_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {ATTENDANCE_STATUS_LABEL[s]}
            </option>
          ))}
        </SelectNative>
        {compact ? (
          <Button
            type="button"
            size="sm"
            onClick={() => void submit()}
            disabled={save === "saving"}
          >
            Save
          </Button>
        ) : null}
      </div>

      {!compact ? (
        <Input
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setSave("idle");
          }}
          placeholder="Note (optional) — e.g. reason for leave"
          aria-label="Attendance note"
        />
      ) : null}

      <div className="flex items-center gap-3">
        {!compact ? (
          <Button
            type="button"
            size="sm"
            onClick={() => void submit()}
            disabled={save === "saving"}
          >
            Save attendance
          </Button>
        ) : null}
        {saveLabel ? (
          <p
            className={cn(
              "text-xs",
              save === "error"
                ? "text-[var(--color-destructive)]"
                : "text-[var(--color-muted-foreground)]",
            )}
            aria-live="polite"
          >
            {saveLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}
