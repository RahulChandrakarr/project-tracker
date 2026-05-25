/**
 * Freehand drawing model for notebook pages. Strokes are stored as JSON on the
 * page row. Points are normalised (0..1) against the page box so a drawing
 * scales with the page across view modes and screen sizes.
 */

export type DrawTool = "pencil" | "pen" | "marker" | "highlighter" | "eraser";

export const DRAW_TOOLS: DrawTool[] = [
  "pencil",
  "pen",
  "marker",
  "highlighter",
  "eraser",
];

export type StrokePoint = { x: number; y: number; p: number };

export type Stroke = {
  tool: DrawTool;
  color: string;
  /** Size multiplier (toolbar), applied on top of the tool's base width. */
  size: number;
  points: StrokePoint[];
};

export type Drawing = { strokes: Stroke[] };

export const EMPTY_DRAWING: Drawing = { strokes: [] };

export const TOOL_META: Record<
  DrawTool,
  {
    label: string;
    /** Base line width in CSS px at size multiplier 1. */
    baseSize: number;
    alpha: number;
    composite: GlobalCompositeOperation;
    /** Whether stylus pressure varies the stroke width. */
    pressure: boolean;
  }
> = {
  pencil: {
    label: "Pencil",
    baseSize: 2,
    alpha: 1,
    composite: "source-over",
    pressure: true,
  },
  pen: {
    label: "Pen",
    baseSize: 3.5,
    alpha: 1,
    composite: "source-over",
    pressure: true,
  },
  marker: {
    label: "Marker",
    baseSize: 8,
    alpha: 1,
    composite: "source-over",
    pressure: false,
  },
  highlighter: {
    label: "Highlighter",
    baseSize: 18,
    alpha: 0.3,
    composite: "source-over",
    pressure: false,
  },
  eraser: {
    label: "Eraser",
    baseSize: 20,
    alpha: 1,
    composite: "destination-out",
    pressure: false,
  },
};

function isDrawTool(value: unknown): value is DrawTool {
  return typeof value === "string" && (DRAW_TOOLS as string[]).includes(value);
}

function toPoint(value: unknown): StrokePoint | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.x !== "number" || typeof v.y !== "number") return null;
  return { x: v.x, y: v.y, p: typeof v.p === "number" ? v.p : 0.5 };
}

/** Safely coerce stored JSON into a Drawing, dropping anything malformed. */
export function asDrawing(value: unknown): Drawing {
  if (!value || typeof value !== "object") return { strokes: [] };
  const raw = (value as Record<string, unknown>).strokes;
  if (!Array.isArray(raw)) return { strokes: [] };

  const strokes: Stroke[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const s = item as Record<string, unknown>;
    if (!isDrawTool(s.tool) || !Array.isArray(s.points)) continue;
    const points = s.points
      .map(toPoint)
      .filter((p): p is StrokePoint => p !== null);
    if (points.length === 0) continue;
    strokes.push({
      tool: s.tool,
      color: typeof s.color === "string" ? s.color : "#1c1d22",
      size: typeof s.size === "number" ? s.size : 1,
      points,
    });
  }
  return { strokes };
}
