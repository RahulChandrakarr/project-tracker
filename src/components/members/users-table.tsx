"use client";

import { Trash2 } from "lucide-react";

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
import { deleteUser, updateUserRole } from "@/lib/users/actions";
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
    <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Last sign-in</TableHead>
            <TableHead className="w-[120px] text-right">Actions</TableHead>
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
                      {u.fullName ?? "Unnamed"}
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
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
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
  );
}
