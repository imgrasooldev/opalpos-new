"use client";

import { LineChart } from "@/components/charts/line-chart";
import {
  SALES_RANGES,
  type SalesRange,
} from "@/components/dashboard/dashboard-data";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const RANGES = Object.keys(SALES_RANGES) as SalesRange[];

function formatTick(value: number): string {
  if (value === 0) return "0";
  return value >= 1000 ? `${value / 1000}K` : String(value);
}

export function SalesOverview({
  range,
  onRangeChange: setRange,
  className,
}: {
  range: SalesRange;
  onRangeChange: (range: SalesRange) => void;
  className?: string;
}) {
  const data = SALES_RANGES[range];
  const up = data.delta.direction === "up";

  return (
    <Card
      className={className}
      title="Sales overview"
      action={
        // Range switcher; each tab swaps in its own static series
        <div className="flex items-center gap-0.5 rounded-lg bg-surface p-0.5">
          {RANGES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === range}
              onClick={() => setRange(option)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                option === range
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted hover:text-foreground",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      }
    >
      <LineChart
        points={data.points}
        ticks={data.ticks}
        formatTick={formatTick}
        tickEvery={data.tickEvery}
        label={data.description}
        className="text-foreground"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-[13px]">
        <span className="h-2 w-2 rounded-full bg-brand-500" />
        <span className="text-muted">Total sales (USD)</span>
        <span className="font-semibold tabular-nums">{data.total}</span>
        <span
          className={cn(
            "flex items-center gap-1 font-medium",
            up ? "text-emerald-600" : "text-rose-600",
          )}
        >
          <Icon name={up ? "trend-up" : "trend-down"} className="h-3.5 w-3.5" />
          {data.delta.value}
        </span>
        <span className="text-muted">vs previous {range === "12M" ? "year" : "period"}</span>
      </div>
    </Card>
  );
}
