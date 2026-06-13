"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * A Card whose body collapses behind a clickable header strip. `defaultOpen` is
 * decided by the caller (the sidebar opens a section only when it has data).
 * The header shows the title, an optional count badge, and a description that's
 * hidden while collapsed to keep the strip compact.
 */
export function CollapsibleCard({
  title,
  description,
  badge,
  defaultOpen = true,
  contentClassName,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-6 text-left hover:bg-[var(--color-muted)]/40"
      >
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold leading-none tracking-tight">
              {title}
            </span>
            {badge !== undefined && badge !== null ? (
              <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs font-medium text-[var(--color-muted-foreground)]">
                {badge}
              </span>
            ) : null}
          </div>
          {open && description ? (
            <span className="text-sm text-[var(--color-muted-foreground)]">
              {description}
            </span>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-[var(--color-muted-foreground)] transition-transform",
            open ? "" : "-rotate-90",
          )}
        />
      </button>
      {open ? (
        <div className={cn("p-6 pt-0", contentClassName)}>{children}</div>
      ) : null}
    </Card>
  );
}
