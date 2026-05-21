"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Mail,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { AppRole } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/members", label: "Members", icon: Users, adminOnly: true },
  { href: "/invite", label: "Invite", icon: Mail, adminOnly: true },
];

export function Sidebar({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const visible = NAV.filter((item) => !item.adminOnly || role === "admin");

  return (
    <aside className="hidden w-60 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-background)] md:flex md:flex-col">
      <div className="flex h-14 items-center border-b border-[var(--color-border)] px-5">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Projects Tracker
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {visible.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-[var(--color-secondary)] text-[var(--color-foreground)]"
                  : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--color-border)] p-4 text-xs text-[var(--color-muted-foreground)]">
        v0.1.0 · {role === "admin" ? "Admin" : "Member"}
      </div>
    </aside>
  );
}
