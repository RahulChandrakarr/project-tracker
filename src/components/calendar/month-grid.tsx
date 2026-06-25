"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { DayEntryStack } from "@/components/calendar/day-entry-card";
import { cn } from "@/lib/utils";
import type { CalendarDaySummary } from "@/lib/calendar/queries";
import { todayDateKey } from "@/lib/calendar/dates";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isWeekendColumn(col: number): boolean {
  return col === 0 || col === 6;
}

const weekendCellClass =
  "bg-[var(--color-muted)]/45";

const weekendHeaderClass =
  "bg-[var(--color-muted)]/55";

function leadingBlanks(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

function trailingBlanks(year: number, month: number, daysInMonth: number): number {
  const total = leadingBlanks(year, month) + daysInMonth;
  const remainder = total % 7;
  return remainder === 0 ? 0 : 7 - remainder;
}

function HolidayLabel({ name }: { name: string }) {
  return (
    <span
      className="mb-1 block truncate rounded border border-[var(--color-border)] bg-[var(--color-muted)] px-1 py-0.5 text-[10px] font-medium leading-tight text-[var(--color-muted-foreground)]"
      title={name}
    >
      {name}
    </span>
  );
}

export function MonthGrid({
  year,
  month,
  days,
  selectedDate,
  onSelectDate,
}: {
  year: number;
  month: number;
  days: CalendarDaySummary[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}) {
  const today = todayDateKey();
  const lead = leadingBlanks(year, month);
  const trail = trailingBlanks(year, month, days.length);

  const cells: (CalendarDaySummary | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...days,
    ...Array.from({ length: trail }, () => null),
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
      <div className="grid grid-cols-7 border-b border-[var(--color-border)]">
        {WEEKDAYS.map((label, col) => (
          <div
            key={label}
            className={cn(
              "border-r border-[var(--color-border)] px-2 py-2 text-center text-xs font-medium text-[var(--color-muted-foreground)] last:border-r-0",
              isWeekendColumn(col) && weekendHeaderClass,
            )}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, index) => {
          const col = index % 7;
          const weekend = isWeekendColumn(col);

          if (!day) {
            return (
              <div
                key={`empty-${index}`}
                className={cn(
                  "min-h-28 border-b border-r border-[var(--color-border)] last:border-r-0",
                  weekend ? weekendCellClass : "bg-[var(--color-muted)]/20",
                )}
                aria-hidden
              />
            );
          }

          const dayNum = Number(day.date.slice(8, 10));
          const isSelected = day.date === selectedDate;
          const isToday = day.date === today;
          const hasEntries = day.entries.length > 0;

          return (
            // Not a <button>: cells contain interactive children (entry links,
            // "+N more"), and nesting buttons/anchors inside a button is invalid
            // HTML and breaks hydration. Use a div with button semantics.
            <div
              key={day.date}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDate(day.date)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectDate(day.date);
                }
              }}
              aria-pressed={isSelected}
              aria-label={`${dayNum}${day.holidayName ? `, ${day.holidayName}` : ""}${hasEntries ? `, ${day.entries.length} entries` : ""}`}
              className={cn(
                "group flex min-h-28 cursor-pointer flex-col border-b border-r border-[var(--color-border)] p-1.5 text-left transition-colors last:border-r-0",
                "hover:bg-[var(--color-accent)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)]",
                weekend && !isSelected && weekendCellClass,
                isSelected && "bg-[var(--color-secondary)]",
              )}
            >
              <div className="mb-1 flex shrink-0 justify-end">
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center text-xs font-medium",
                    isToday &&
                      "rounded-full border-2 border-[var(--color-foreground)] font-semibold",
                  )}
                >
                  {dayNum}
                </span>
              </div>

              {day.holidayName ? <HolidayLabel name={day.holidayName} /> : null}

              {hasEntries ? (
                <DayEntryStack
                  entries={day.entries}
                  onMoreClick={() => onSelectDate(day.date)}
                />
              ) : (
                <span className="mt-auto opacity-0 transition-opacity group-hover:opacity-100">
                  <Plus
                    className="size-3.5 text-[var(--color-muted-foreground)]"
                    aria-hidden
                  />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarToolbar({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  onToday,
  onNew,
  canEdit,
}: {
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onNew: () => void;
  canEdit: boolean;
}) {
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-base font-semibold tracking-tight">{monthLabel}</p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToday}
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-accent)]"
        >
          Today
        </button>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onPrevMonth}
            aria-label="Previous month"
            className="grid size-8 place-items-center rounded-md border border-[var(--color-border)] hover:bg-[var(--color-accent)]"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            aria-label="Next month"
            className="grid size-8 place-items-center rounded-md border border-[var(--color-border)] hover:bg-[var(--color-accent)]"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={onNew}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90"
          >
            <Plus className="size-4" />
            New
          </button>
        ) : null}
      </div>
    </div>
  );
}
