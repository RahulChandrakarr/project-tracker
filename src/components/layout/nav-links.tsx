"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  NotebookPen,
  Calendar,
  Tags,
  Users,
  UserCircle,
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
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/notebook", label: "Notebook", icon: NotebookPen },
  { href: "/categories", label: "Categories", icon: Tags, adminOnly: true },
  { href: "/members", label: "Members", icon: Users, adminOnly: true },
];

/**
 * The navigation list, shared by the desktop sidebar and the mobile drawer.
 * `onNavigate` lets the drawer close itself when a link is tapped.
 */
export function NavLinks({
  role,
  userId,
  onNavigate,
}: {
  role: AppRole;
  userId: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const visible = NAV.filter((item) => !item.adminOnly || role === "admin");
  const profileHref = `/members/${userId}`;

  const itemClass = (active: boolean) =>
    cn(
      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
      active
        ? "bg-[var(--color-secondary)] text-[var(--color-foreground)]"
        : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]",
    );

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {visible.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/"
            ? pathname === "/"
            : href === "/members"
              ? pathname === "/members"
              : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={itemClass(active)}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}

      <Link
        href={profileHref}
        onClick={onNavigate}
        className={itemClass(pathname === profileHref)}
      >
        <UserCircle className="size-4" />
        My profile
      </Link>
    </nav>
  );
}
