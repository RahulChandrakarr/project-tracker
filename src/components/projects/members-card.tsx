"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CalendarDays, UserPlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SelectNative } from "@/components/ui/select-native";
import { Badge } from "@/components/ui/badge";
import {
  addMember,
  removeMember,
  updateMemberRole,
  type MemberFormState,
} from "@/lib/members/mutations";
import type { ProjectMember, AssignableUser } from "@/lib/members/queries";
import { PROJECT_MEMBER_ROLE_LABEL } from "@/types/project";

const INITIAL: MemberFormState = { ok: false };

export function MembersCard({
  projectId,
  members,
  assignableUsers,
  canManage,
  canViewTeamCalendars,
  currentUserId,
}: {
  projectId: string;
  members: ProjectMember[];
  assignableUsers: AssignableUser[];
  canManage: boolean;
  /** Project / workspace admins may open teammates' work calendars. */
  canViewTeamCalendars: boolean;
  currentUserId: string;
}) {
  const [state, formAction, pending] = useActionState(addMember, INITIAL);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team</CardTitle>
        <CardDescription>
          {members.length} {members.length === 1 ? "member" : "members"} on
          this project.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {canManage && assignableUsers.length > 0 ? (
          <form action={formAction} className="flex items-end gap-2">
            <input type="hidden" name="projectId" value={projectId} />
            <div className="flex-1">
              <SelectNative name="userId" defaultValue="" required>
                <option value="" disabled>
                  Add a team member...
                </option>
                {assignableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName ?? u.id.slice(0, 8)}
                  </option>
                ))}
              </SelectNative>
            </div>
            <SelectNative name="role" defaultValue="member" className="w-32">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </SelectNative>
            <Button type="submit" size="sm" disabled={pending}>
              <UserPlus />
              Add
            </Button>
          </form>
        ) : null}

        {state.message && !state.ok ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {state.message}
          </p>
        ) : null}

        <ul className="flex flex-col divide-y divide-[var(--color-border)]">
          {members.map((m) => {
            const isSelf = m.userId === currentUserId;
            return (
              <li
                key={m.userId}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="grid size-8 shrink-0 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-secondary)] text-xs font-medium"
                    aria-hidden
                  >
                    {(m.fullName ?? m.userId).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {m.fullName ?? "Unnamed"}
                      {isSelf ? (
                        <span className="ml-2 text-xs text-[var(--color-muted-foreground)]">
                          (you)
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-[var(--color-muted-foreground)]">
                      Added{" "}
                      {new Date(m.addedAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canViewTeamCalendars && !isSelf ? (
                    <Button asChild variant="ghost" size="icon" className="shrink-0">
                      <Link
                        href={`/calendar?user=${m.userId}`}
                        aria-label={`View ${m.fullName ?? "member"} calendar`}
                      >
                        <CalendarDays />
                      </Link>
                    </Button>
                  ) : null}

                  {canManage && !isSelf ? (
                    <form action={updateMemberRole}>
                      <input
                        type="hidden"
                        name="projectId"
                        value={projectId}
                      />
                      <input type="hidden" name="userId" value={m.userId} />
                      <SelectNative
                        name="role"
                        defaultValue={m.role}
                        className="h-8 w-28 text-xs"
                        onChange={(e) => e.currentTarget.form?.requestSubmit()}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </SelectNative>
                    </form>
                  ) : (
                    <Badge variant="outline">
                      {PROJECT_MEMBER_ROLE_LABEL[m.role]}
                    </Badge>
                  )}

                  {canManage && !isSelf ? (
                    <form action={removeMember}>
                      <input
                        type="hidden"
                        name="projectId"
                        value={projectId}
                      />
                      <input type="hidden" name="userId" value={m.userId} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${m.fullName ?? "member"}`}
                      >
                        <X />
                      </Button>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        {canManage && assignableUsers.length === 0 ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Everyone is already on this project. Invite more users via /signup
            to expand the pool.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
