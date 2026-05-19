"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp, type AuthFormState } from "@/lib/auth/actions";

const INITIAL: AuthFormState = { ok: false };

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, INITIAL);

  if (state.ok) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-3 text-sm">
        {state.message}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" autoComplete="name" />
        {state.fieldErrors?.fullName ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {state.fieldErrors.fullName}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        {state.fieldErrors?.email ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
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

      <Button type="submit" disabled={pending}>
        {pending ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
