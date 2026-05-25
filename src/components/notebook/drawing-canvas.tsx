"use client";

import * as React from "react";

import {
  TOOL_META,
  type Drawing,
  type DrawTool,
  type Stroke,
  type StrokePoint,
} from "./drawing";

/**
 * A page-sized drawing surface. Strokes are controlled by the parent (so it
 * owns undo/redo + autosave); this renders them plus the in-progress stroke
 * and reports finished strokes via `onCommit`. Points are normalised to the
 * canvas box so a drawing scales with the page. Pointer events unify mouse,
 * touch, and stylus (with pressure).
 */
export function DrawingCanvas({
  editable,
  drawing,
  tool = "pen",
  color = "#1c1d22",
  size = 1,
  onCommit,
}: {
  editable: boolean;
  drawing: Drawing;
  tool?: DrawTool;
  color?: string;
  size?: number;
  onCommit?: (stroke: Stroke) => void;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const boxRef = React.useRef({ w: 1, h: 1 });
  const liveRef = React.useRef<StrokePoint[] | null>(null);
  const rafRef = React.useRef<number | null>(null);

  // Latest tool settings, read inside pointer handlers / live redraw without
  // having to rebind them or widen redraw's dependencies.
  const toolRef = React.useRef(tool);
  const colorRef = React.useRef(color);
  const sizeRef = React.useRef(size);
  React.useEffect(() => {
    toolRef.current = tool;
    colorRef.current = color;
    sizeRef.current = size;
  }, [tool, color, size]);

  const drawStroke = React.useCallback(
    (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
      const { w, h } = boxRef.current;
      const meta = TOOL_META[stroke.tool];
      const pts = stroke.points;
      if (pts.length === 0) return;

      ctx.save();
      ctx.globalCompositeOperation = meta.composite;
      ctx.globalAlpha = meta.alpha;
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const px = (pt: StrokePoint) => ({ x: pt.x * w, y: pt.y * h });

      if (pts.length === 1) {
        const a = px(pts[0]);
        ctx.beginPath();
        ctx.arc(a.x, a.y, Math.max(0.6, (stroke.size * meta.baseSize) / 2), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }

      if (meta.alpha < 1) {
        // Highlighter: one constant-width path so self-overlap doesn't darken.
        ctx.lineWidth = stroke.size * meta.baseSize;
        ctx.beginPath();
        const first = px(pts[0]);
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < pts.length; i++) {
          const b = px(pts[i]);
          ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();
      } else {
        // Opaque tools: per-segment width so stylus pressure shows through.
        for (let i = 1; i < pts.length; i++) {
          const a = px(pts[i - 1]);
          const b = px(pts[i]);
          const pressure = meta.pressure
            ? 0.35 + 0.65 * ((pts[i - 1].p + pts[i].p) / 2)
            : 1;
          ctx.lineWidth = Math.max(0.6, stroke.size * meta.baseSize * pressure);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      ctx.restore();
    },
    [],
  );

  const redraw = React.useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { w, h } = boxRef.current;
    ctx.clearRect(0, 0, w, h);
    for (const s of drawing.strokes) drawStroke(ctx, s);
    if (liveRef.current && liveRef.current.length > 0) {
      drawStroke(ctx, {
        tool: toolRef.current,
        color: colorRef.current,
        size: sizeRef.current,
        points: liveRef.current,
      });
    }
  }, [drawing, drawStroke]);

  const scheduleRedraw = React.useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      redraw();
    });
  }, [redraw]);

  // Keep the backing store sized to the box (DPR-aware) and redraw on resize.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      boxRef.current = { w: rect.width, h: rect.height };
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [redraw]);

  React.useEffect(() => {
    redraw();
  }, [redraw]);

  const pushPoint = (
    clientX: number,
    clientY: number,
    pressure: number,
    rect: DOMRect,
  ) => {
    liveRef.current?.push({
      x: Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width))),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / Math.max(1, rect.height))),
      p: pressure > 0 ? pressure : 0.5,
    });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!editable) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    liveRef.current = [];
    pushPoint(e.clientX, e.clientY, e.pressure, e.currentTarget.getBoundingClientRect());
    scheduleRedraw();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!editable || !liveRef.current) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const native = e.nativeEvent;
    const events =
      typeof native.getCoalescedEvents === "function"
        ? native.getCoalescedEvents()
        : [native];
    for (const ev of events) {
      pushPoint(ev.clientX, ev.clientY, ev.pressure, rect);
    }
    scheduleRedraw();
  };

  const finishStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!editable || !liveRef.current) return;
    const points = liveRef.current;
    liveRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
    if (points.length > 0) {
      onCommit?.({
        tool: toolRef.current,
        color: colorRef.current,
        size: sizeRef.current,
        points,
      });
    }
    scheduleRedraw();
  };

  return (
    <canvas
      ref={canvasRef}
      className="nb-canvas"
      style={{
        pointerEvents: editable ? "auto" : "none",
        touchAction: editable ? "none" : "auto",
        cursor: editable ? "crosshair" : "default",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishStroke}
      onPointerCancel={finishStroke}
    />
  );
}
