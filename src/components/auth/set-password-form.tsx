"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setPassword, type AuthFormState } from "@/lib/auth/actions";

const INITIAL: AuthFormState = { ok: false };

export function SetPasswordForm() {
  const [state, formAction, pending] = useActionState(setPassword, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
        />
        {state.fieldErrors?.password ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {state.fieldErrors.password}
          </p>
        ) : null}
        <p className="text-xs text-[var(--color-muted-foreground)]">
          At least 8 characters.
        </p>
      </div>

      {state.message && !state.ok ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Set password and continue"}
      </Button>
    </form>
  );
}
