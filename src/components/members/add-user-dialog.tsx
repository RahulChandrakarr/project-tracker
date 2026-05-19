"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { createUser, type UserFormState } from "@/lib/users/actions";

const INITIAL: UserFormState = { ok: false };

export function AddUserDialog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const open = searchParams.get("new") === "1";

  const [state, formAction, pending] = useActionState(createUser, INITIAL);

  function onOpenChange(next: boolean) {
    const params = new URLSearchParams(searchParams);
    if (next) params.set("new", "1");
    else params.delete("new");
    router.replace(`?${params.toString()}`);
  }

  React.useEffect(() => {
    if (state.ok && open) onOpenChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <>
      <Button size="sm" onClick={() => onOpenChange(true)}>
        <Plus />
        Add member
      </Button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
            <DialogDescription>
              Create a new user account. They can sign in immediately with the
              email and password you set.
            </DialogDescription>
          </DialogHeader>

          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" name="fullName" required maxLength={100} />
              {state.fieldErrors?.fullName ? (
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {state.fieldErrors.fullName}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
              {state.fieldErrors?.email ? (
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {state.fieldErrors.email}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Temporary password</Label>
              <Input
                id="password"
                name="password"
                type="text"
                required
                minLength={8}
                maxLength={72}
                placeholder="Min 8 characters"
              />
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Share this with the user. They can change it after signing in.
              </p>
              {state.fieldErrors?.password ? (
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {state.fieldErrors.password}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role">Role</Label>
              <SelectNative id="role" name="role" defaultValue="member">
                <option value="member">Member</option>
                <option value="admin">App admin (full access)</option>
              </SelectNative>
            </div>

            {state.message && !state.ok ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {state.message}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Creating..." : "Add member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
