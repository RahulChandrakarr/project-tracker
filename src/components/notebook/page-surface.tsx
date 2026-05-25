"use client";

import * as React from "react";
import { Bookmark } from "lucide-react";

import { cn } from "@/lib/utils";

import { paperBackground, paperLinePitch } from "./notebook-theme";
import type { PageState } from "./notebook-store";

/**
 * The physical look of one page: themed paper colour, optional ruling/grid,
 * rounded corners, drop shadow, page number, and a bookmark ribbon. Content
 * (the editor, or read-only HTML) is rendered into the scrollable middle, where
 * the paper guides tile so they scroll with the writing.
 */
export function PageSurface({
  page,
  pageNumber,
  children,
  overlay,
  className,
}: {
  page: PageState;
  pageNumber: number;
  children: React.ReactNode;
  /** A layer rendered above the page content (e.g. the drawing canvas). */
  overlay?: React.ReactNode;
  className?: string;
}) {
  // For lined papers, drive the text line-height (via --nb-line) and the first
  // line's offset off the same pitch the rules use, so writing sits centred
  // between the lines instead of drifting across them.
  const pitch = page.show_guides ? paperLinePitch(page.paper_style) : null;
  const contentStyle: React.CSSProperties = page.show_guides
    ? paperBackground(page.paper_style)
    : {};
  if (pitch != null) {
    contentStyle.paddingTop = `${pitch}px`;
    (contentStyle as Record<string, string>)["--nb-line"] = `${pitch}px`;
  }

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden",
        page.rounded ? "rounded-2xl" : "rounded-sm",
        className,
      )}
      style={{
        background:
          "linear-gradient(180deg, var(--nb-page) 0%, var(--nb-page-edge) 100%)",
        color: "var(--nb-ink)",
        fontFamily: "var(--nb-font)",
        boxShadow: page.shadow
          ? "0 24px 50px -24px var(--nb-binding), 0 2px 8px rgba(0,0,0,0.08)"
          : "none",
      }}
    >
      {page.bookmarked ? (
        <Bookmark
          aria-hidden
          className="absolute right-6 top-0 size-6 -translate-y-1 fill-current"
          style={{ color: "var(--nb-accent)" }}
        />
      ) : null}

      <div
        className="relative flex-1 overflow-y-auto px-9 py-10 sm:px-12"
        style={contentStyle}
      >
        {children}
      </div>

      {overlay}

      <div
        className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[11px] tabular-nums"
        style={{ color: "var(--nb-ink-soft)" }}
      >
        {pageNumber}
      </div>
    </div>
  );
}
