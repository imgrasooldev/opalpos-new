"use client";

import { DonutChart } from "@/components/charts/donut-chart";
import {
  REVENUE_BY_RANGE,
  type DashboardRange,
} from "@/components/dashboard/dashboard-data";
import { RangeMenu } from "@/components/dashboard/range-menu";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

const CURRENCY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function RevenueBreakdown({
  range,
  onRangeChange,
}: {
  range: DashboardRange;
  onRangeChange: (range: DashboardRange) => void;
}) {
  const segments = REVENUE_BY_RANGE[range];
  const sales = segments.find((s) => s.label === "Sales")!.value;

  return (
    <Card
      title="Revenue breakdown"
      action={<RangeMenu value={range} onChange={onRangeChange} size="sm" />}
    >
      <div className="flex flex-wrap items-center gap-6">
        <DonutChart
          segments={segments}
          centerValue={CURRENCY.format(sales)}
          centerLabel="Total sales"
        />

        {/* the legend names every segment with its value and share, not just a color */}
        <ul className="flex min-w-40 flex-1 flex-col">
          {segments.map((segment) => (
            <li key={segment.label} className="flex items-center gap-2.5 py-1.5">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="flex-1 leading-tight">
                <span className="block text-[13px] text-muted">
                  {segment.label}
                </span>
                <span className="block text-[13px] font-semibold tabular-nums">
                  {CURRENCY.format(segment.value)}
                </span>
              </span>
              <span className="text-[13px] tabular-nums text-muted">
                {segment.share}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <a
        href="/reports"
        className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-500 hover:text-brand-600"
      >
        View full report
        <Icon name="arrow-right" className="h-4 w-4" />
      </a>
    </Card>
  );
}
