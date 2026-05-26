import { Suspense } from "react";
import { redirect } from "next/navigation";

import { PageMotion, PageMotionItem } from "@/components/layout/page-motion";
import { AddUserDialog } from "@/components/members/add-user-dialog";
import { UsersTable } from "@/components/members/users-table";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listAllUsers } from "@/lib/users/queries";

export default async function MembersPage() {
  const me = await getCurrentUser();

  // Non-admins shouldn't be here. The sidebar already hides the link for
  // them, but this is the authoritative gate.
  if (me.role !== "admin") {
    redirect("/");
  }

  const users = await listAllUsers();

  return (
    <PageMotion className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageMotionItem className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Everyone with access to the workspace. Add new accounts and manage
            roles here.
          </p>
        </div>
        <Suspense fallback={null}>
          <AddUserDialog />
        </Suspense>
      </PageMotionItem>

      <PageMotionItem>
        <UsersTable users={users} currentUserId={me.id} />
      </PageMotionItem>
    </PageMotion>
  );
}
