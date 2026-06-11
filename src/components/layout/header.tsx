import Link from "next/link";
import { Search } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { signOut } from "@/lib/auth/actions";
import type { AppRole } from "@/lib/supabase/types";

import { MobileNav } from "./mobile-nav";

export function Header({
  user,
  role,
  userId,
  avatarUrl,
}: {
  user: User;
  role: AppRole;
  userId: string;
  avatarUrl: string | null;
}) {
  const initials = (user.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-background)] px-4 md:px-6">
      <MobileNav role={role} userId={userId} />

      <div className="relative hidden w-full max-w-sm sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
        <Input
          type="search"
          placeholder="Search projects, clients..."
          className="pl-9"
        />
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <NotificationBell userId={userId} />

        <Link
          href={`/members/${userId}`}
          aria-label="Your profile"
          title="Your profile"
          className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-secondary)] text-xs font-medium transition-opacity hover:opacity-80"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            initials
          )}
        </Link>

        <form action={signOut} className="hidden md:block">
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
