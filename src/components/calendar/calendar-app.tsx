"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { DayDetailDialog } from "@/components/calendar/day-detail-dialog";
import { CalendarToolbar, MonthGrid } from "@/components/calendar/month-grid";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import { todayDateKey } from "@/lib/calendar/dates";
import { getHolidayRegion, HOLIDAY_REGION_LABEL } from "@/lib/calendar/holidays";
import type {
  CalendarDayDetail,
  CalendarMonthData,
  CalendarProjectOption,
  CalendarViewableUser,
} from "@/lib/calendar/queries";

function buildCalendarHref({
  userId,
  currentUserId,
  year,
  month,
  date,
}: {
  userId: string;
  currentUserId: string;
  year: number;
  month: number;
  date?: string | null;
}): string {
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
  });
  if (date) params.set("date", date);
  if (userId !== currentUserId) params.set("user", userId);
  return `/calendar?${params.toString()}`;
}

export function CalendarApp({
  userId,
  currentUserId,
  userLabel,
  viewableUsers,
  canViewOthersCalendars,
  monthData,
  selectedDate,
  dayDetail,
  projectOptions,
}: {
  userId: string;
  currentUserId: string;
  userLabel: string | null;
  viewableUsers: CalendarViewableUser[];
  canViewOthersCalendars: boolean;
  monthData: CalendarMonthData;
  selectedDate: string | null;
  dayDetail: CalendarDayDetail | null;
  projectOptions: CalendarProjectOption[];
}) {
  const router = useRouter();
  const canEdit = userId === currentUserId;
  const showPicker = canViewOthersCalendars && viewableUsers.length > 1;
  const { year, month } = monthData;
  const dialogOpen = Boolean(selectedDate && dayDetail);

  function navigate(next: {
    userId?: string;
    year?: number;
    month?: number;
    date?: string | null;
  }) {
    router.push(
      buildCalendarHref({
        userId: next.userId ?? userId,
        currentUserId,
        year: next.year ?? year,
        month: next.month ?? month,
        date: next.date === undefined ? selectedDate : next.date,
      }),
    );
  }

  function goMonth(delta: number) {
    let nextMonth = month + delta;
    let nextYear = year;
    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    } else if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    navigate({ year: nextYear, month: nextMonth });
  }

  function goToday() {
    const now = new Date();
    navigate({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      date: todayDateKey(),
    });
  }

  function openNew() {
    const now = new Date();
    navigate({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      date: todayDateKey(),
    });
  }

  const title = canEdit
    ? "Work calendar"
    : `${userLabel ?? "Member"}'s calendar`;

  const holidayRegion = HOLIDAY_REGION_LABEL[getHolidayRegion()];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {monthData.tasksCompleted} tasks completed · {monthData.daysLogged}{" "}
            days logged · {holidayRegion} holidays
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {showPicker ? (
            <SelectNative
              value={userId}
              onChange={(e) => navigate({ userId: e.target.value })}
              className="min-w-48"
              aria-label="View calendar for"
            >
              {viewableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.id === currentUserId
                    ? "My calendar"
                    : (u.fullName ?? u.id.slice(0, 8))}
                </option>
              ))}
            </SelectNative>
          ) : null}

          {!canEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate({ userId: currentUserId })}
            >
              My calendar
            </Button>
          ) : null}
        </div>
      </div>

      <CalendarToolbar
        year={year}
        month={month}
        onPrevMonth={() => goMonth(-1)}
        onNextMonth={() => goMonth(1)}
        onToday={goToday}
        onNew={openNew}
        canEdit={canEdit}
      />

      <MonthGrid
        year={year}
        month={month}
        days={monthData.days}
        selectedDate={selectedDate}
        onSelectDate={(date) => navigate({ date })}
      />

      {dayDetail ? (
        <DayDetailDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) navigate({ date: null });
          }}
          detail={dayDetail}
          canEdit={canEdit}
          projectOptions={projectOptions}
        />
      ) : null}
    </div>
  );
}
