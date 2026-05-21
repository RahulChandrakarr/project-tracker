"use client";

import * as React from "react";
import { useActionState } from "react";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { inviteUser, type UserFormState } from "@/lib/users/actions";

const INITIAL: UserFormState = { ok: false };

export function InviteForm() {
  const [state, formAction, pending] = useActionState(inviteUser, INITIAL);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          name="fullName"
          required
          maxLength={100}
          placeholder="Jane Doe"
        />
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
          required
          placeholder="jane@example.com"
        />
        {state.fieldErrors?.email ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="role">Role</Label>
        <SelectNative id="role" name="role" defaultValue="member">
          <option value="member">Member</option>
          <option value="admin">App admin (full access)</option>
        </SelectNative>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Admins can manage every project, member, and category.
        </p>
      </div>

      {state.message ? (
        <p
          className={
            state.ok
              ? "rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2 text-sm"
              : "text-sm text-[var(--color-muted-foreground)]"
          }
        >
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="self-start">
        <Mail />
        {pending ? "Sending..." : "Send invite"}
      </Button>
    </form>
  );
}
