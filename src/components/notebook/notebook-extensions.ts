import type { Extensions } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { TextStyle, Color, FontFamily } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { TextAlign } from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extension-placeholder";

/**
 * The single source of truth for the notebook's rich-text schema. Shared by the
 * live editor (single-page writing mode) and `generateHTML` (the read-only
 * pages shown while flipping through the book), so both render identically.
 *
 * StarterKit v3 already bundles Underline and Link, so they are not re-added.
 */
export function notebookExtensions(placeholder = "Start writing…"): Extensions {
  return [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    TextStyle,
    Color,
    FontFamily,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Placeholder.configure({ placeholder }),
  ];
}

export const FONT_CHOICES: { label: string; value: string }[] = [
  { label: "Theme default", value: "" },
  { label: "Sans", value: "ui-sans-serif, system-ui, sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "ui-monospace, 'SF Mono', monospace" },
  { label: "Handwriting", value: "'Segoe Script', 'Bradley Hand', cursive" },
  { label: "Rounded", value: "'Quicksand', 'Trebuchet MS', sans-serif" },
];

export const INK_SWATCHES: string[] = [
  "#1c1d22",
  "#26408b",
  "#0f766e",
  "#a8421f",
  "#c026d3",
  "#e11d48",
  "#f59e0b",
  "#10b981",
];

export const HIGHLIGHT_SWATCHES: string[] = [
  "#fff176",
  "#a7f3d0",
  "#bfdbfe",
  "#fbcfe8",
  "#fed7aa",
];
