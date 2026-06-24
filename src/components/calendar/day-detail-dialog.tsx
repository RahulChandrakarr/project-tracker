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
import type { CalendarDayDetail } from "@/lib/calendar/queries";
import { formatDate } from "@/lib/format";

export function DayDetailDialog({
  open,
  onOpenChange,
  detail,
  canEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: CalendarDayDetail;
  canEdit: boolean;
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
              ? "Daily work log and completed tasks."
              : "Work log and completed tasks for this day."}
          </DialogDescription>
        </DialogHeader>
        <DayDetailPanel detail={detail} canEdit={canEdit} embedded />
      </DialogContent>
    </Dialog>
  );
}
