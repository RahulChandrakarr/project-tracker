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
import { WorkLogEditor } from "@/components/calendar/work-log-editor";
import type { CalendarDayDetail } from "@/lib/calendar/queries";
import { formatDate } from "@/lib/format";

function plainTextFromHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildDaySummary(detail: CalendarDayDetail): string {
  const lines: string[] = [`Work log — ${formatDate(detail.date)}`, ""];

  if (detail.logBody) {
    lines.push(plainTextFromHtml(detail.logBody));
    lines.push("");
  } else {
    lines.push("(No manual log)");
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
}: {
  detail: CalendarDayDetail;
  canEdit: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold tracking-tight">Work log</h3>
        {canEdit ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Write what you worked on today. Changes save automatically.
          </p>
        ) : null}
        <WorkLogEditor
          key={detail.date}
          date={detail.date}
          defaultBody={detail.logBody}
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
  embedded = false,
}: {
  detail: CalendarDayDetail;
  canEdit: boolean;
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
        <DayDetailBody detail={detail} canEdit={canEdit} />
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
        <DayDetailBody detail={detail} canEdit={canEdit} />
      </CardContent>
    </Card>
  );
}
