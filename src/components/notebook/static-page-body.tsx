"use client";

import * as React from "react";
import { generateHTML, type JSONContent } from "@tiptap/core";

import type { Json } from "@/lib/supabase/types";

import { notebookExtensions } from "./notebook-extensions";

/**
 * Renders a page's stored document to read-only HTML, no editor instance
 * required. Used for the flip-book pages (where mounting an editor per page
 * would be wasteful) and sidebar previews.
 */
export function StaticPageBody({ content }: { content: Json }) {
  const html = React.useMemo(() => {
    try {
      return generateHTML(content as JSONContent, notebookExtensions());
    } catch {
      return "";
    }
  }, [content]);

  if (!html) {
    return (
      <p className="text-sm italic" style={{ color: "var(--nb-ink-soft)" }}>
        Empty page.
      </p>
    );
  }

  return (
    <div className="nb-prose" dangerouslySetInnerHTML={{ __html: html }} />
  );
}
