import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Calendar, NotebookPen } from "lucide-react";

import {
  PageMotion,
  PageMotionItem,
  PageMotionSection,
} from "@/components/layout/page-motion";
import { Button } from "@/components/ui/button";
import { DashboardTasksTable } from "@/components/projects/dashboard-tasks-table";
import { MemberProfileCard } from "@/components/members/member-profile-card";
import { MemberReport } from "@/components/members/member-report";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getMemberCompletedTasks,
  getMemberOpenTasks,
  getMemberProfile,
  getMemberReport,
} from "@/lib/profile/queries";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const me = await getCurrentUser();
  const isSelf = me.id === id;
  const canView = isSelf || me.role === "admin";
  if (!canView) redirect("/");

  // Admins can edit anyone; everyone can edit their own profile.
  const canEdit = isSelf || me.role === "admin";

  const [profile, report, openTasks, completedTasks] = await Promise.all([
    getMemberProfile(id),
    getMemberReport(id),
    getMemberOpenTasks(id),
    getMemberCompletedTasks(id),
  ]);

  if (!profile) notFound();

  return (
    <PageMotion className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageMotionItem className="flex flex-wrap items-center justify-between gap-3">
        {me.role === "admin" ? (
          <Button asChild variant="ghost" size="sm" className="w-fit">
            <Link href="/members">
              <ChevronLeft />
              All members
            </Link>
          </Button>
        ) : (
          <span />
        )}

        {isSelf ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="w-fit">
              <Link href="/calendar">
                <Calendar />
                Work calendar
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-fit">
              <Link href="/notebook">
                <NotebookPen />
                Open my notebook
              </Link>
            </Button>
          </div>
        ) : me.role === "admin" ? (
          <Button asChild variant="outline" size="sm" className="w-fit">
            <Link href={`/calendar?user=${id}`}>
              <Calendar />
              View work calendar
            </Link>
          </Button>
        ) : null}
      </PageMotionItem>

      <PageMotionItem>
        <MemberProfileCard
          profile={profile}
          canEdit={canEdit}
          canChangePassword={isSelf}
        />
      </PageMotionItem>

      <PageMotionItem>
        <MemberReport report={report} />
      </PageMotionItem>

      <PageMotionItem className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PageMotionSection className="flex flex-col gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Open tasks
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Assigned and not done, soonest deadline first.
            </p>
          </div>
          <DashboardTasksTable
            tasks={openTasks}
            variant="open"
            emptyMessage="No open tasks assigned."
          />
        </PageMotionSection>

        <PageMotionSection className="flex flex-col gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Recently completed
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Assigned tasks marked done most recently.
            </p>
          </div>
          <DashboardTasksTable
            tasks={completedTasks}
            variant="completed"
            emptyMessage="Nothing completed yet."
          />
        </PageMotionSection>
      </PageMotionItem>
    </PageMotion>
  );
}
