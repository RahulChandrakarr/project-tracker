"use client";

import Link from "next/link";
import { Check, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { approveUser, deleteUser, updateUserRole } from "@/lib/users/actions";
import type { AppUser } from "@/lib/users/queries";
import { formatDate } from "@/lib/format";
import { APP_ROLE_LABEL } from "@/types/project";

import { SetPasswordDialog } from "./set-password-dialog";

export function UsersTable({
  users,
  currentUserId,
}: {
  users: AppUser[];
  currentUserId: string;
}) {
  if (users.length === 0) {
    return (
      <div className="grid h-48 place-items-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-card)] text-sm text-[var(--color-muted-foreground)]">
        No members yet.
      </div>
    );
  }

  return (
    <>
      {/* Mobile: stacked cards. */}
      <ul className="flex flex-col gap-3 md:hidden">
        {users.map((u) => {
          const isSelf = u.id === currentUserId;
          return (
            <li
              key={u.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-secondary)] text-xs font-medium"
                  aria-hidden
                >
                  {(u.fullName ?? u.email ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    <Link
                      href={`/members/${u.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {u.fullName ?? "Unnamed"}
                    </Link>
                    {isSelf ? (
                      <span className="ml-2 text-xs text-[var(--color-muted-foreground)]">
                        (you)
                      </span>
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-[var(--color-muted-foreground)]">
                    {u.email ?? "—"}
                  </div>
                  <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                    Joined {formatDate(u.createdAt)}
                    {" · "}
                    {u.lastSignInAt
                      ? `Last seen ${formatDate(u.lastSignInAt)}`
                      : "Never signed in"}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ApprovalBadge approved={u.approved} />
                {!u.approved && !isSelf ? (
                  <AcceptButton
                    userId={u.id}
                    label={u.fullName ?? u.email ?? "this user"}
                  />
                ) : null}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                {isSelf ? (
                  <Badge variant="outline">{APP_ROLE_LABEL[u.role]}</Badge>
                ) : (
                  <form action={updateUserRole}>
                    <input type="hidden" name="userId" value={u.id} />
                    <SelectNative
                      name="role"
                      defaultValue={u.role}
                      className="h-8 w-32 text-xs"
                      onChange={(e) => e.currentTarget.form?.requestSubmit()}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </SelectNative>
                  </form>
                )}
                <div className="flex items-center gap-1">
                  <SetPasswordDialog
                    userId={u.id}
                    label={u.fullName ?? u.email ?? "this user"}
                  />
                  {isSelf ? null : (
                    <form action={deleteUser} className="inline">
                      <input type="hidden" name="userId" value={u.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${u.fullName ?? u.email}`}
                      >
                        <Trash2 />
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* md+ : full table */}
      <div className="hidden overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] md:block">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Last sign-in</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[200px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            return (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div
                      className="grid size-8 shrink-0 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-secondary)] text-xs font-medium"
                      aria-hidden
                    >
                      {(u.fullName ?? u.email ?? "?")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <span>
                      <Link
                        href={`/members/${u.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {u.fullName ?? "Unnamed"}
                      </Link>
                      {isSelf ? (
                        <span className="ml-2 text-xs text-[var(--color-muted-foreground)]">
                          (you)
                        </span>
                      ) : null}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-[var(--color-muted-foreground)]">
                  {u.email ?? "—"}
                </TableCell>
                <TableCell>
                  {isSelf ? (
                    <Badge variant="outline">{APP_ROLE_LABEL[u.role]}</Badge>
                  ) : (
                    <form action={updateUserRole}>
                      <input type="hidden" name="userId" value={u.id} />
                      <SelectNative
                        name="role"
                        defaultValue={u.role}
                        className="h-8 w-32 text-xs"
                        onChange={(e) =>
                          e.currentTarget.form?.requestSubmit()
                        }
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </SelectNative>
                    </form>
                  )}
                </TableCell>
                <TableCell className="text-[var(--color-muted-foreground)]">
                  {formatDate(u.createdAt)}
                </TableCell>
                <TableCell className="text-[var(--color-muted-foreground)]">
                  {u.lastSignInAt ? formatDate(u.lastSignInAt) : "Never"}
                </TableCell>
                <TableCell>
                  <ApprovalBadge approved={u.approved} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {!u.approved && !isSelf ? (
                      <AcceptButton
                        userId={u.id}
                        label={u.fullName ?? u.email ?? "this user"}
                      />
                    ) : null}
                    <SetPasswordDialog
                      userId={u.id}
                      label={u.fullName ?? u.email ?? "this user"}
                    />
                    {isSelf ? null : (
                      <form action={deleteUser} className="inline">
                        <input type="hidden" name="userId" value={u.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${u.fullName ?? u.email}`}
                        >
                          <Trash2 />
                        </Button>
                      </form>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
    </>
  );
}

function ApprovalBadge({ approved }: { approved: boolean }) {
  return approved ? (
    <Badge variant="outline" className="text-[var(--color-muted-foreground)]">
      Active
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="border-[var(--color-foreground)] font-medium"
    >
      Pending
    </Badge>
  );
}

function AcceptButton({ userId, label }: { userId: string; label: string }) {
  return (
    <form action={approveUser} className="inline">
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" size="sm" aria-label={`Accept ${label}`}>
        <Check />
        Accept
      </Button>
    </form>
  );
}
