import { LineChart } from "@/components/charts/line-chart";
import { SALES_SERIES } from "@/components/dashboard/dashboard-data";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const RANGES = ["7D", "30D", "12M"] as const;
const ACTIVE_RANGE = "30D";

const TICKS = [0, 500, 1000, 1500, 2000, 2500];

function formatTick(value: number): string {
  if (value === 0) return "0";
  return value >= 1000 ? `${value / 1000}K` : String(value);
}

export function SalesOverview({ className }: { className?: string }) {
  return (
    <Card
      className={className}
      title="Sales overview"
      action={
        // range switcher — abhi static, sirf active state dikhta hai
        <div className="flex items-center gap-0.5 rounded-lg bg-surface p-0.5">
          {RANGES.map((range) => (
            <button
              key={range}
              type="button"
              aria-pressed={range === ACTIVE_RANGE}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                range === ACTIVE_RANGE
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted hover:text-foreground",
              )}
            >
              {range}
            </button>
          ))}
        </div>
      }
    >
      <LineChart
        points={SALES_SERIES}
        ticks={TICKS}
        formatTick={formatTick}
        tickEvery={2}
        className="text-foreground"
      />

      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-[13px]">
        <span className="h-2 w-2 rounded-full bg-brand-500" />
        <span className="text-muted">Total sales (USD)</span>
        <span className="font-semibold tabular-nums">$24,580.00</span>
        <span className="flex items-center gap-1 font-medium text-emerald-600">
          <Icon name="trend-up" className="h-3.5 w-3.5" />
          +12.5%
        </span>
      </div>
    </Card>
  );
}
