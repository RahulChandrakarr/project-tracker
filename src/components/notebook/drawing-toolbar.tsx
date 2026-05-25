"use client";

import * as React from "react";
import {
  Brush,
  Eraser,
  Highlighter,
  Pencil,
  PenLine,
  Redo2,
  Trash2,
  Undo2,
  type LucideIcon,
} from "lucide-react";

import { Popover } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { DRAW_TOOLS, TOOL_META, type DrawTool } from "./drawing";
import { INK_SWATCHES } from "./notebook-extensions";

const TOOL_ICON: Record<DrawTool, LucideIcon> = {
  pencil: Pencil,
  pen: PenLine,
  marker: Brush,
  highlighter: Highlighter,
  eraser: Eraser,
};

export function DrawingToolbar({
  tool,
  setTool,
  color,
  setColor,
  size,
  setSize,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
}: {
  tool: DrawTool;
  setTool: (t: DrawTool) => void;
  color: string;
  setColor: (c: string) => void;
  size: number;
  setSize: (s: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  return (
    <div className="nb-toolbar">
      {DRAW_TOOLS.map((t) => {
        const Icon = TOOL_ICON[t];
        return (
          <button
            key={t}
            type="button"
            title={TOOL_META[t].label}
            aria-label={TOOL_META[t].label}
            aria-pressed={tool === t}
            className={cn("nb-toolbtn", tool === t && "nb-toolbtn--active")}
            onClick={() => setTool(t)}
          >
            <Icon className="size-4" />
          </button>
        );
      })}

      <span aria-hidden className="nb-tooldiv" />

      <Popover
        align="start"
        triggerLabel="Stroke colour"
        triggerClassName="nb-toolbtn"
        trigger={
          <span
            className="size-4 rounded-full border border-[var(--nb-binding)]"
            style={{ background: color }}
          />
        }
      >
        {({ close }) => (
          <div className="flex w-44 flex-col gap-2 p-1">
            <div className="grid grid-cols-4 gap-1.5">
              {INK_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Colour ${c}`}
                  className="size-7 rounded-md border border-[var(--color-border)]"
                  style={{ background: c }}
                  onClick={() => {
                    setColor(c);
                    close();
                  }}
                />
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-7 w-9 cursor-pointer rounded border border-[var(--color-border)] bg-transparent"
              />
              Custom
            </label>
          </div>
        )}
      </Popover>

      <label className="flex items-center gap-2 px-1" title="Brush size">
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.1}
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          className="nb-size-range"
          aria-label="Brush size"
        />
      </label>

      <span aria-hidden className="nb-tooldiv" />

      <button
        type="button"
        title="Undo"
        aria-label="Undo"
        disabled={!canUndo}
        onClick={onUndo}
        className="nb-toolbtn"
      >
        <Undo2 className="size-4" />
      </button>
      <button
        type="button"
        title="Redo"
        aria-label="Redo"
        disabled={!canRedo}
        onClick={onRedo}
        className="nb-toolbtn"
      >
        <Redo2 className="size-4" />
      </button>
      <button
        type="button"
        title="Clear page drawing"
        aria-label="Clear page drawing"
        onClick={onClear}
        className="nb-toolbtn"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
