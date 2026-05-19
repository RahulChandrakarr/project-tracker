import Link from "next/link";
import { Search, Plus } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signOut } from "@/lib/auth/actions";

export function Header({ user }: { user: User }) {
  const initials = (user.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-[var(--color-border)] bg-[var(--color-background)] px-4 md:px-6">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
        <Input
          type="search"
          placeholder="Search projects, clients..."
          className="pl-9"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <Button size="sm" asChild>
          <Link href="/projects?new=1">
            <Plus />
            New project
          </Link>
        </Button>

        <div className="hidden text-right text-xs leading-tight text-[var(--color-muted-foreground)] sm:block">
          <div className="truncate font-medium text-[var(--color-foreground)]">
            {user.email}
          </div>
        </div>

        <div
          className="grid size-8 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-secondary)] text-xs font-medium"
          aria-hidden
        >
          {initials}
        </div>

        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
