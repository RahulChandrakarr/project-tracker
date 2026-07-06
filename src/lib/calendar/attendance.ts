import type { AttendanceStatus } from "@/lib/supabase/types";

/** Order shown in the attendance dropdown. */
export const ATTENDANCE_STATUS_ORDER: AttendanceStatus[] = [
  "present",
  "half_day",
  "work_from_home",
  "paid_leave",
  "sick_leave",
  "holiday",
  "absent",
];

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  half_day: "Half day",
  paid_leave: "Paid leave",
  sick_leave: "Sick leave",
  work_from_home: "Work from home",
  holiday: "Holiday",
};

/**
 * Static Tailwind classes per status. `dot` is a solid swatch for the grid;
 * `badge` is a soft pill for labels. Kept as literal strings so Tailwind's
 * scanner picks them up.
 */
export const ATTENDANCE_STATUS_STYLE: Record<
  AttendanceStatus,
  { dot: string; badge: string }
> = {
  present: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  absent: {
    dot: "bg-rose-500",
    badge: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
  half_day: {
    dot: "bg-amber-500",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  paid_leave: {
    dot: "bg-violet-500",
    badge: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  },
  sick_leave: {
    dot: "bg-orange-500",
    badge: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  },
  work_from_home: {
    dot: "bg-sky-500",
    badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
  holiday: {
    dot: "bg-slate-400",
    badge: "bg-slate-400/15 text-slate-600 dark:text-slate-300",
  },
};

export function isAttendanceStatus(value: string): value is AttendanceStatus {
  return (value as AttendanceStatus) in ATTENDANCE_STATUS_LABEL;
}

/**
 * Effective status for a day given the stored value. A working day (weekday,
 * not a public holiday) at or before today with no record counts as absent.
 * Weekends, holidays, and future days with no record show nothing.
 */
export function effectiveAttendance({
  stored,
  isPast,
  isWeekend,
  isHoliday,
}: {
  stored: AttendanceStatus | null;
  isPast: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
}): AttendanceStatus | null {
  if (stored) return stored;
  if (isPast && !isWeekend && !isHoliday) return "absent";
  return null;
}
