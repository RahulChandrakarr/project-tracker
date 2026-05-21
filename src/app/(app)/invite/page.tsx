import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InviteForm } from "@/components/invite/invite-form";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function InvitePage() {
  const me = await getCurrentUser();
  if (me.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invite member</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Send an email invite. The invitee clicks the link in the email,
          sets their own password, and lands on the dashboard signed in.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New invite</CardTitle>
          <CardDescription>
            For admin-created accounts with a temporary password, use{" "}
            <Link
              href="/members?new=1"
              className="font-medium text-[var(--color-foreground)] underline-offset-4 hover:underline"
            >
              Members → Add member
            </Link>{" "}
            instead.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteForm />
        </CardContent>
      </Card>
    </div>
  );
}
