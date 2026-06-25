"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DayDetailPanel } from "@/components/calendar/day-detail-panel";
import type {
  CalendarDayDetail,
  CalendarProjectOption,
} from "@/lib/calendar/queries";
import { formatDate } from "@/lib/format";

export function DayDetailDialog({
  open,
  onOpenChange,
  detail,
  canEdit,
  projectOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: CalendarDayDetail;
  canEdit: boolean;
  projectOptions: CalendarProjectOption[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {formatDate(detail.date)}
            {detail.holidayName ? (
              <Badge variant="muted">{detail.holidayName}</Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            {canEdit
              ? "Log the day's tasks and see what you completed."
              : "Logged tasks and completed work for this day."}
          </DialogDescription>
        </DialogHeader>
        <DayDetailPanel
          detail={detail}
          canEdit={canEdit}
          projectOptions={projectOptions}
          embedded
        />
      </DialogContent>
    </Dialog>
  );
}
