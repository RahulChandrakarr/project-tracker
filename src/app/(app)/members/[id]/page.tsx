import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MemberProfileCard } from "@/components/members/member-profile-card";
import { MemberReport } from "@/components/members/member-report";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getMemberProfile, getMemberReport } from "@/lib/profile/queries";

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

  const [profile, report] = await Promise.all([
    getMemberProfile(id),
    getMemberReport(id),
  ]);

  if (!profile) notFound();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      {me.role === "admin" ? (
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href="/members">
            <ChevronLeft />
            All members
          </Link>
        </Button>
      ) : null}

      <MemberProfileCard profile={profile} canEdit={canEdit} />

      <MemberReport report={report} />
    </div>
  );
}
