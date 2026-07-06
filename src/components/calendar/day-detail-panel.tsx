"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CompletedTasksList } from "@/components/calendar/completed-tasks-list";
import { DayTasksEditor } from "@/components/calendar/day-tasks-editor";
import { AttendanceControl } from "@/components/calendar/attendance-control";
import { TASK_STATUS_LABEL } from "@/lib/calendar/status";
import type {
  CalendarDayDetail,
  CalendarProjectOption,
} from "@/lib/calendar/queries";
import { formatDate } from "@/lib/format";

function buildDaySummary(detail: CalendarDayDetail): string {
  const lines: string[] = [`Work log — ${formatDate(detail.date)}`, ""];

  if (detail.taskEntries.length > 0) {
    lines.push("Tasks:");
    for (const t of detail.taskEntries) {
      const project = t.projectName ? ` (${t.projectName})` : "";
      lines.push(`• ${t.title}${project} — ${TASK_STATUS_LABEL[t.status]}`);
    }
    lines.push("");
  } else {
    lines.push("(No tasks logged)");
    lines.push("");
  }

  if (detail.completedTasks.length > 0) {
    lines.push("Completed tasks:");
    for (const t of detail.completedTasks) {
      const project = t.projectName ? ` (${t.projectName})` : "";
      lines.push(`• ${t.title}${project}`);
    }
  } else {
    lines.push("Completed tasks: none");
  }

  return lines.join("\n");
}

function DayDetailBody({
  detail,
  canEdit,
  projectOptions,
  userId,
  attendanceEditable,
}: {
  detail: CalendarDayDetail;
  canEdit: boolean;
  projectOptions: CalendarProjectOption[];
  userId: string;
  attendanceEditable: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold tracking-tight">Attendance</h3>
        {attendanceEditable ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Set attendance for this day. No entry counts as absent.
          </p>
        ) : null}
        <AttendanceControl
          key={`att-${detail.date}`}
          userId={userId}
          date={detail.date}
          defaultStatus={detail.attendanceStatus}
          defaultNote={detail.attendanceNote}
          canEdit={attendanceEditable}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold tracking-tight">Tasks</h3>
        {canEdit ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Log the tasks you worked on. Pick a status, add a project if it
            relates to one, then Save.
          </p>
        ) : null}
        <DayTasksEditor
          key={detail.date}
          date={detail.date}
          defaultEntries={detail.taskEntries}
          projectOptions={projectOptions}
          canEdit={canEdit}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold tracking-tight">
          Completed tasks
        </h3>
        <CompletedTasksList tasks={detail.completedTasks} />
      </section>
    </div>
  );
}

export function DayDetailPanel({
  detail,
  canEdit,
  projectOptions,
  userId,
  attendanceEditable,
  embedded = false,
}: {
  detail: CalendarDayDetail;
  canEdit: boolean;
  projectOptions: CalendarProjectOption[];
  userId: string;
  attendanceEditable: boolean;
  embedded?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);

  async function copySummary() {
    const text = buildDaySummary(detail);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const copyButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void copySummary()}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? "Copied" : "Copy summary"}
    </Button>
  );

  if (embedded) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">{copyButton}</div>
        <DayDetailBody
          detail={detail}
          canEdit={canEdit}
          projectOptions={projectOptions}
          userId={userId}
          attendanceEditable={attendanceEditable}
        />
      </div>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{formatDate(detail.date)}</CardTitle>
          <CardDescription>
            {canEdit
              ? "Your daily log and completed tasks for this day."
              : "Work log and completed tasks for this day."}
          </CardDescription>
        </div>
        {copyButton}
      </CardHeader>
      <CardContent>
        <DayDetailBody
          detail={detail}
          canEdit={canEdit}
          projectOptions={projectOptions}
          userId={userId}
          attendanceEditable={attendanceEditable}
        />
      </CardContent>
    </Card>
  );
}
