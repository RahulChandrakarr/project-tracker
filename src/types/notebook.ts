/**
 * Notebook domain vocabulary: the themes and paper styles a page can take.
 * Framework-agnostic (imported by both server actions and client UI). The
 * visual CSS for each lives in `@/components/notebook/notebook-theme`.
 */

export type NotebookTheme =
  | "minimal"
  | "vintage"
  | "dark"
  | "school"
  | "professional"
  | "pastel"
  | "cyberpunk"
  | "handwritten";

export const NOTEBOOK_THEMES: NotebookTheme[] = [
  "minimal",
  "vintage",
  "dark",
  "school",
  "professional",
  "pastel",
  "cyberpunk",
  "handwritten",
];

export const THEME_LABEL: Record<NotebookTheme, string> = {
  minimal: "Minimal",
  vintage: "Vintage",
  dark: "Dark mode",
  school: "School notebook",
  professional: "Professional",
  pastel: "Cute pastel",
  cyberpunk: "Cyberpunk",
  handwritten: "Handwritten diary",
};

export type PaperStyle =
  | "blank"
  | "ruled"
  | "narrow"
  | "wide"
  | "grid"
  | "dot"
  | "graph"
  | "cornell"
  | "music"
  | "checklist";

export const PAPER_STYLES: PaperStyle[] = [
  "blank",
  "ruled",
  "narrow",
  "wide",
  "grid",
  "dot",
  "graph",
  "cornell",
  "music",
  "checklist",
];

export const PAPER_LABEL: Record<PaperStyle, string> = {
  blank: "Blank",
  ruled: "Ruled",
  narrow: "Narrow ruled",
  wide: "Wide ruled",
  grid: "Grid",
  dot: "Dot grid",
  graph: "Graph",
  cornell: "Cornell notes",
  music: "Music sheet",
  checklist: "Checklist",
};

export const DEFAULT_THEME: NotebookTheme = "minimal";
export const DEFAULT_PAPER: PaperStyle = "ruled";

export function isNotebookTheme(value: string): value is NotebookTheme {
  return (NOTEBOOK_THEMES as string[]).includes(value);
}

export function isPaperStyle(value: string): value is PaperStyle {
  return (PAPER_STYLES as string[]).includes(value);
}
