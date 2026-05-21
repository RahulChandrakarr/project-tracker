"use client";

import * as React from "react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ProductivitySeries } from "@/lib/profile/queries";

type Range = "daily" | "weekly" | "monthly";

const RANGES: { value: Range; label: string; unit: string }[] = [
  { value: "daily", label: "Daily", unit: "day" },
  { value: "weekly", label: "Weekly", unit: "week" },
  { value: "monthly", label: "Monthly", unit: "month" },
];

const CHART_HEIGHT = 112;

export function ProductivityChart({ series }: { series: ProductivitySeries }) {
  const [range, setRange] = React.useState<Range>("weekly");

  const buckets = series[range];
  const unit = RANGES.find((r) => r.value === range)?.unit ?? "week";
  const max = Math.max(
    1,
    ...buckets.map((b) => Math.max(b.completed, b.created)),
  );

  const thisPeriod = buckets[buckets.length - 1]?.completed ?? 0;
  const lastPeriod = buckets[buckets.length - 2]?.completed ?? 0;
  const growthRate =
    lastPeriod === 0
      ? null
      : Math.round(((thisPeriod - lastPeriod) / lastPeriod) * 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Productivity</CardTitle>
            <CardDescription>
              Tasks completed and added per {unit}.
            </CardDescription>
          </div>

          <div className="inline-flex rounded-md border border-[var(--color-border)] p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRange(r.value)}
                className={cn(
                  "rounded px-3 py-1 text-xs font-medium transition-colors",
                  range === r.value
                    ? "bg-[var(--color-secondary)] text-[var(--color-foreground)]"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs text-[var(--color-muted-foreground)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-[var(--color-primary)]" />
              Completed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-[var(--color-primary)]/30" />
              Added
            </span>
          </div>
          <GrowthBadge unit={unit} growthRate={growthRate} thisPeriod={thisPeriod} />
        </div>

        <div className="flex items-end justify-between gap-1.5">
          {buckets.map((b) => {
            const completedH =
              b.completed === 0
                ? 2
                : Math.max(6, Math.round((b.completed / max) * CHART_HEIGHT));
            const createdH =
              b.created === 0
                ? 2
                : Math.max(6, Math.round((b.created / max) * CHART_HEIGHT));
            return (
              <div
                key={b.key}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                <div className="text-xs font-medium tabular-nums text-[var(--color-muted-foreground)]">
                  {b.completed}
                </div>
                <div
                  className="flex items-end gap-0.5"
                  style={{ height: CHART_HEIGHT }}
                >
                  <div
                    className="w-2.5 rounded-t bg-[var(--color-primary)]"
                    style={{ height: `${completedH}px` }}
                    title={`${b.completed} completed`}
                  />
                  <div
                    className="w-2.5 rounded-t bg-[var(--color-primary)]/30"
                    style={{ height: `${createdH}px` }}
                    title={`${b.created} added`}
                  />
                </div>
                <div className="text-[10px] text-[var(--color-muted-foreground)]">
                  {b.label}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function GrowthBadge({
  unit,
  growthRate,
  thisPeriod,
}: {
  unit: string;
  growthRate: number | null;
  thisPeriod: number;
}) {
  const Icon =
    growthRate === null || growthRate === 0
      ? Minus
      : growthRate > 0
        ? TrendingUp
        : TrendingDown;

  const trend =
    growthRate === null
      ? "no prior data"
      : `${growthRate > 0 ? "+" : ""}${growthRate}% vs last ${unit}`;

  return (
    <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm">
      <Icon className="size-4 text-[var(--color-muted-foreground)]" />
      <span className="font-medium tabular-nums">{thisPeriod}</span>
      <span className="text-[var(--color-muted-foreground)]">
        this {unit} · {trend}
      </span>
    </div>
  );
}
