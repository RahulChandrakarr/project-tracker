import Link from "next/link";

import type { AppRole } from "@/lib/supabase/types";

import { Logo } from "./logo";
import { NavLinks } from "./nav-links";

export function Sidebar({ role, userId }: { role: AppRole; userId: string }) {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-background)] md:flex md:flex-col">
      <div className="flex h-14 items-center border-b border-[var(--color-border)] px-5">
        <Link href="/" aria-label="NJ DesignPark Tracker home">
          <Logo className="h-8 w-auto" />
        </Link>
      </div>

      <NavLinks role={role} userId={userId} />

      <div className="border-t border-[var(--color-border)] p-4 text-xs text-[var(--color-muted-foreground)]">
        v0.1.0 · {role === "admin" ? "Admin" : "Member"}
      </div>
    </aside>
  );
}
