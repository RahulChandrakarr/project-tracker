"use client";

import * as React from "react";
import { useActionState } from "react";
import { KeyRound } from "lucide-react";

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
import { setUserPassword, type UserFormState } from "@/lib/users/actions";

const INITIAL: UserFormState = { ok: false };

export function SetPasswordDialog({
  userId,
  label,
}: {
  userId: string;
  label: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: UserFormState, formData: FormData) => {
      const result = await setUserPassword(prev, formData);
      if (result.ok) setOpen(false);
      return result;
    },
    INITIAL,
  );

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Set password for ${label}`}
        title="Set password"
        onClick={() => setOpen(true)}
      >
        <KeyRound />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set password</DialogTitle>
            <DialogDescription>
              Set a new password for {label}. Share it with them securely. They
              can change it after signing in.
            </DialogDescription>
          </DialogHeader>

          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="userId" value={userId} />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`password-${userId}`}>New password</Label>
              <Input
                id={`password-${userId}`}
                name="password"
                type="text"
                required
                minLength={8}
                maxLength={72}
                placeholder="Min 8 characters"
              />
              {state.fieldErrors?.password ? (
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {state.fieldErrors.password}
                </p>
              ) : null}
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
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Set password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
