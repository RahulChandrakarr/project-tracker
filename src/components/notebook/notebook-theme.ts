/**
 * The notebook's visual design system. Unlike the grayscale app chrome, the
 * notebook carries its own palette per theme. `themeVars` returns CSS custom
 * properties to spread on the notebook root; `paperBackground` returns the
 * background layers that draw a page's ruling/grid using those variables.
 */
import type { CSSProperties } from "react";

import type { NotebookTheme, PaperStyle } from "@/types/notebook";

type Vars = Record<`--nb-${string}`, string>;

const THEMES: Record<NotebookTheme, Vars> = {
  minimal: {
    "--nb-shell": "#e9eaee",
    "--nb-page": "#ffffff",
    "--nb-page-edge": "#f1f2f5",
    "--nb-ink": "#1c1d22",
    "--nb-ink-soft": "#6b7280",
    "--nb-guide": "rgba(30,41,59,0.10)",
    "--nb-accent": "#2563eb",
    "--nb-binding": "rgba(0,0,0,0.18)",
    "--nb-font": "'Inter', ui-sans-serif, system-ui, sans-serif",
  },
  vintage: {
    "--nb-shell": "#5b4636",
    "--nb-page": "#f6ecd4",
    "--nb-page-edge": "#efe0bf",
    "--nb-ink": "#43342a",
    "--nb-ink-soft": "#8a6f57",
    "--nb-guide": "rgba(120,85,50,0.22)",
    "--nb-accent": "#a8421f",
    "--nb-binding": "rgba(60,40,20,0.35)",
    "--nb-font": "Georgia, 'Times New Roman', serif",
  },
  dark: {
    "--nb-shell": "#0f1115",
    "--nb-page": "#1b1f29",
    "--nb-page-edge": "#222735",
    "--nb-ink": "#e6e8ee",
    "--nb-ink-soft": "#9aa3b2",
    "--nb-guide": "rgba(255,255,255,0.08)",
    "--nb-accent": "#6366f1",
    "--nb-binding": "rgba(0,0,0,0.6)",
    "--nb-font": "'Inter', ui-sans-serif, system-ui, sans-serif",
  },
  school: {
    "--nb-shell": "#cdd7e5",
    "--nb-page": "#fdfdff",
    "--nb-page-edge": "#eef3fb",
    "--nb-ink": "#102a43",
    "--nb-ink-soft": "#627d98",
    "--nb-guide": "rgba(59,130,246,0.30)",
    "--nb-accent": "#e11d48",
    "--nb-binding": "rgba(20,40,80,0.25)",
    "--nb-font": "'Inter', ui-sans-serif, system-ui, sans-serif",
  },
  professional: {
    "--nb-shell": "#2b2f36",
    "--nb-page": "#fbfbf9",
    "--nb-page-edge": "#f1f1ec",
    "--nb-ink": "#1f2933",
    "--nb-ink-soft": "#52606d",
    "--nb-guide": "rgba(31,41,51,0.10)",
    "--nb-accent": "#0f766e",
    "--nb-binding": "rgba(0,0,0,0.28)",
    "--nb-font": "Georgia, 'Iowan Old Style', serif",
  },
  pastel: {
    "--nb-shell": "#f6e7f1",
    "--nb-page": "#fff8fc",
    "--nb-page-edge": "#fdeef7",
    "--nb-ink": "#5b4b6b",
    "--nb-ink-soft": "#a892b8",
    "--nb-guide": "rgba(216,150,196,0.35)",
    "--nb-accent": "#c084fc",
    "--nb-binding": "rgba(170,120,160,0.30)",
    "--nb-font": "'Quicksand', 'Trebuchet MS', ui-rounded, sans-serif",
  },
  cyberpunk: {
    "--nb-shell": "#05060a",
    "--nb-page": "#0c1020",
    "--nb-page-edge": "#121833",
    "--nb-ink": "#7df9ff",
    "--nb-ink-soft": "#5a7fb0",
    "--nb-guide": "rgba(255,46,151,0.25)",
    "--nb-accent": "#ff2e97",
    "--nb-binding": "rgba(0,0,0,0.7)",
    "--nb-font": "'JetBrains Mono', ui-monospace, 'SF Mono', monospace",
  },
  handwritten: {
    "--nb-shell": "#ded3c0",
    "--nb-page": "#fffdf5",
    "--nb-page-edge": "#f7f1e1",
    "--nb-ink": "#26408b",
    "--nb-ink-soft": "#7b86a8",
    "--nb-guide": "rgba(38,64,139,0.16)",
    "--nb-accent": "#d4524e",
    "--nb-binding": "rgba(90,70,40,0.28)",
    "--nb-font": "'Segoe Script', 'Bradley Hand', 'Comic Sans MS', cursive",
  },
};

export function themeVars(theme: NotebookTheme): CSSProperties {
  return THEMES[theme] as CSSProperties;
}

// A square outline drawn at the top of a 16x32 tile so it repeats once per
// 32px ruled row. Stroke is a fixed slate so it reads on light papers.
const CHECKBOX =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='32'%3E%3Crect x='1.5' y='9' width='12' height='12' rx='2.5' fill='none' stroke='%23475569' stroke-opacity='0.5' stroke-width='1.4'/%3E%3C/svg%3E\")";

const MUSIC_STAFF =
  "repeating-linear-gradient(to bottom," +
  "var(--nb-guide) 0px,var(--nb-guide) 1px,transparent 1px,transparent 11px," +
  "var(--nb-guide) 11px,var(--nb-guide) 12px,transparent 12px,transparent 22px," +
  "var(--nb-guide) 22px,var(--nb-guide) 23px,transparent 23px,transparent 33px," +
  "var(--nb-guide) 33px,var(--nb-guide) 34px,transparent 34px,transparent 44px," +
  "var(--nb-guide) 44px,var(--nb-guide) 45px,transparent 45px,transparent 78px)";

// A 1px rule at the BOTTOM of each row (100% = the row height set by
// backgroundSize). Text rows share this pitch and start one row down, so each
// line of writing sits centred between two rules.
const RULE =
  "linear-gradient(to bottom, transparent calc(100% - 1px), var(--nb-guide) calc(100% - 1px))";

/**
 * Row height (px) for the lined paper styles. Pages with a pitch align their
 * text line-height to it; null means the text uses its default rhythm.
 */
const LINE_PITCH: Partial<Record<PaperStyle, number>> = {
  narrow: 24,
  ruled: 28,
  wide: 34,
  cornell: 28,
  checklist: 32,
};

export function paperLinePitch(style: PaperStyle): number | null {
  return LINE_PITCH[style] ?? null;
}

// Cornell layout: the cue column divider sits this far from the page's left
// padding edge; the main notes (and typed text) live to its right.
const CORNELL_CUE = 104;

/** Left inset (px) the typed text should start at, e.g. past Cornell's cue column. */
export function paperTextInsetLeft(style: PaperStyle): number | null {
  return style === "cornell" ? CORNELL_CUE + 16 : null;
}

function ruled(height: number): CSSProperties {
  return {
    backgroundImage: RULE,
    backgroundSize: `100% ${height}px`,
  };
}

export function paperBackground(style: PaperStyle): CSSProperties {
  switch (style) {
    case "blank":
      return {};
    case "ruled":
      return ruled(28);
    case "narrow":
      return ruled(24);
    case "wide":
      return ruled(34);
    case "grid":
      return {
        backgroundImage:
          "linear-gradient(to bottom, var(--nb-guide) 1px, transparent 1px), linear-gradient(to right, var(--nb-guide) 1px, transparent 1px)",
        backgroundSize: "26px 26px, 26px 26px",
      };
    case "dot":
      return {
        backgroundImage:
          "radial-gradient(var(--nb-guide) 1.5px, transparent 1.6px)",
        backgroundSize: "24px 24px",
      };
    case "graph":
      return {
        backgroundImage:
          "linear-gradient(to bottom, var(--nb-guide) 1px, transparent 1px), linear-gradient(to right, var(--nb-guide) 1px, transparent 1px)",
        backgroundSize: "15px 15px, 15px 15px",
      };
    case "cornell":
      return {
        // ruled rows + vertical cue-column divider + bottom summary divider
        backgroundImage:
          `${RULE}, ` +
          `linear-gradient(to right, transparent ${CORNELL_CUE}px, var(--nb-accent) ${CORNELL_CUE}px, var(--nb-accent) ${CORNELL_CUE + 1}px, transparent ${CORNELL_CUE + 1}px), ` +
          "linear-gradient(to bottom, transparent calc(100% - 110px), var(--nb-accent) calc(100% - 110px), var(--nb-accent) calc(100% - 109px), transparent calc(100% - 109px))",
        backgroundSize: "100% 28px, 100% 100%, 100% 100%",
        backgroundRepeat: "repeat, no-repeat, no-repeat",
      };
    case "music":
      return { backgroundImage: MUSIC_STAFF };
    case "checklist":
      return {
        backgroundImage: `${RULE}, ${CHECKBOX}`,
        backgroundSize: "100% 32px, 16px 32px",
        backgroundPosition: "0 0, 12px 0",
        backgroundRepeat: "repeat, repeat-y",
      };
  }
}
