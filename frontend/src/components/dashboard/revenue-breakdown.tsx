import { DonutChart } from "@/components/charts/donut-chart";
import { REVENUE_BREAKDOWN } from "@/components/dashboard/dashboard-data";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

const CURRENCY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function RevenueBreakdown() {
  return (
    <Card
      title="Revenue breakdown"
      action={
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-surface"
        >
          Last 30 days
          <Icon name="chevron-down" className="h-3.5 w-3.5" />
        </button>
      }
    >
      <div className="flex flex-wrap items-center gap-6">
        <DonutChart
          segments={REVENUE_BREAKDOWN}
          centerValue={CURRENCY.format(24580)}
          centerLabel="Total"
        />

        {/* legend har segment ka naam + value + share likhti hai, sirf rang nahi */}
        <ul className="flex min-w-40 flex-1 flex-col">
          {REVENUE_BREAKDOWN.map((segment) => (
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
