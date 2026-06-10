"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

/**
 * Minimal popover built on a portal rather than CSS `absolute`. The task tree
 * renders inside an `overflow-hidden` list, which would clip an absolutely
 * positioned panel, so the panel is portaled to <body> and positioned from the
 * trigger's bounding rect. No external popover dependency required.
 *
 * `children` may be a render prop receiving `{ close }` so menu actions can
 * dismiss the panel themselves.
 */
export function Popover({
  trigger,
  triggerLabel,
  triggerClassName,
  align = "end",
  className,
  children,
}: {
  trigger: React.ReactNode;
  triggerLabel: string;
  triggerClassName?: string;
  align?: "start" | "end";
  className?: string;
  children:
    | React.ReactNode
    | ((ctx: { close: () => void }) => React.ReactNode);
}) {
  const [open, setOpen] = React.useState(false);
  const [coords, setCoords] = React.useState<{
    top: number;
    bottom: number;
    left: number;
    right: number;
    placement: "below" | "above";
  } | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const place = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Flip the panel above the trigger when there isn't room below it (e.g. the
    // last task near the bottom of the screen). Falls back to whichever side has
    // more space if neither fully fits.
    const gap = 4;
    const panelH = panelRef.current?.offsetHeight ?? 0;
    const spaceBelow = window.innerHeight - r.bottom - gap;
    const spaceAbove = r.top - gap;
    const placement =
      panelH > spaceBelow && spaceAbove > spaceBelow ? "above" : "below";
    setCoords({
      top: r.bottom + gap,
      bottom: window.innerHeight - r.top + gap,
      left: r.left,
      right: window.innerWidth - r.right,
      placement,
    });
  }, []);

  const close = React.useCallback(() => setOpen(false), []);

  // Re-run placement once the panel has mounted and its height is measurable,
  // so the flip decision uses the real panel height rather than 0.
  React.useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  // Keep the panel pinned to the trigger while scrolling/resizing.
  React.useEffect(() => {
    if (!open) return;
    const reposition = () => place();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, place]);

  // Dismiss on outside click or Escape.
  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={triggerLabel}
        title={triggerLabel}
        onClick={() => {
          if (!open) place();
          setOpen((v) => !v);
        }}
        className={cn(
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]",
          triggerClassName,
        )}
      >
        {trigger}
      </button>
      {open && coords
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              style={{
                position: "fixed",
                ...(coords.placement === "above"
                  ? { bottom: coords.bottom }
                  : { top: coords.top }),
                ...(align === "end"
                  ? { right: coords.right }
                  : { left: coords.left }),
              }}
              className={cn(
                "z-50 max-h-72 min-w-[12rem] overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-1 text-[var(--color-card-foreground)] shadow-md",
                className,
              )}
            >
              {typeof children === "function" ? children({ close }) : children}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
