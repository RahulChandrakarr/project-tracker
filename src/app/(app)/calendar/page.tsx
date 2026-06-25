import { notFound } from "next/navigation";

import { PageMotion, PageMotionItem } from "@/components/layout/page-motion";
import { CalendarApp } from "@/components/calendar/calendar-app";
import { canViewUserCalendar, canViewOthersCalendars } from "@/lib/calendar/access";
import { isValidDateKey } from "@/lib/calendar/dates";
import {
  getCalendarMonth,
  getCalendarUserLabel,
  getDayDetail,
  listCalendarProjectOptions,
  listCalendarViewableUsers,
} from "@/lib/calendar/queries";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

function parseYearMonth(
  yearParam: string | undefined,
  monthParam: string | undefined,
): { year: number; month: number } {
  const now = new Date();
  const year = yearParam ? Number(yearParam) : now.getFullYear();
  const month = monthParam ? Number(monthParam) : now.getMonth() + 1;
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  return { year, month };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    user?: string;
    year?: string;
    month?: string;
    date?: string;
  }>;
}) {
  const params = await searchParams;
  const me = await getCurrentUser();
  const targetUserId = params.user ?? me.id;

  if (targetUserId !== me.id) {
    const allowed = await canViewUserCalendar(me.id, targetUserId);
    if (!allowed) notFound();
  }

  const { year, month } = parseYearMonth(params.year, params.month);
  const selectedDate =
    params.date && isValidDateKey(params.date) ? params.date : null;

  const canEdit = targetUserId === me.id;

  const [monthData, viewableUsers, userLabel, canViewOthers, projectOptions] =
    await Promise.all([
      getCalendarMonth(targetUserId, year, month),
      listCalendarViewableUsers(),
      canEdit ? Promise.resolve(me.fullName) : getCalendarUserLabel(targetUserId),
      canViewOthersCalendars(),
      canEdit ? listCalendarProjectOptions() : Promise.resolve([]),
    ]);

  const dayDetail = selectedDate
    ? await getDayDetail(targetUserId, selectedDate)
    : null;

  return (
    <PageMotion className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageMotionItem>
        <CalendarApp
          userId={targetUserId}
          currentUserId={me.id}
          userLabel={userLabel}
          viewableUsers={viewableUsers}
          canViewOthersCalendars={canViewOthers}
          monthData={monthData}
          selectedDate={selectedDate}
          dayDetail={dayDetail}
          projectOptions={projectOptions}
        />
      </PageMotionItem>
    </PageMotion>
  );
}
