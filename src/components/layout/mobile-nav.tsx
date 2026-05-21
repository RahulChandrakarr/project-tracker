"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import type { AppRole } from "@/lib/supabase/types";

import { Logo } from "./logo";
import { NavLinks } from "./nav-links";

/**
 * Mobile navigation: a hamburger button (hidden on md+) that opens a left
 * slide-in drawer with the shared nav links plus sign out. The desktop sidebar
 * covers md+, so the whole thing is `md:hidden`.
 */
export function MobileNav({ role, userId }: { role: AppRole; userId: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className="grid size-9 shrink-0 place-items-center rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)] md:hidden"
        >
          <Menu className="size-5" />
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 md:hidden" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80%] flex-col border-r border-[var(--color-border)] bg-[var(--color-background)] shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left md:hidden"
        >
          <DialogPrimitive.Title className="sr-only">
            Navigation
          </DialogPrimitive.Title>

          <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-4">
            <Logo className="h-8 w-auto" />
            <DialogPrimitive.Close
              aria-label="Close menu"
              className="grid size-8 place-items-center rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>

          <NavLinks
            role={role}
            userId={userId}
            onNavigate={() => setOpen(false)}
          />

          <div className="border-t border-[var(--color-border)] p-3">
            <form action={signOut}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="w-full"
              >
                Sign out
              </Button>
            </form>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
