"use client";

/**
 * Top half of the dashboard: greeting, period picker, KPI cards and the two
 * charts. The period picked in the header (or in the revenue card) drives
 * the KPI cards, the revenue breakdown and the chart tab; the chart tabs can
 * still be switched on their own afterwards.
 */

import { useState } from "react";

import {
  DASHBOARD_RANGES,
  STATS_BY_RANGE,
  type DashboardRange,
  type SalesRange,
} from "@/components/dashboard/dashboard-data";
import { GreetingName } from "@/components/dashboard/greeting-name";
import { RangeMenu } from "@/components/dashboard/range-menu";
import { RevenueBreakdown } from "@/components/dashboard/revenue-breakdown";
import { SalesOverview } from "@/components/dashboard/sales-overview";
import { StatCard } from "@/components/dashboard/stat-card";

export function DashboardOverview({ userName }: { userName: string }) {
  const [range, setRange] = useState<DashboardRange>("30d");
  const [chartRange, setChartRange] = useState<SalesRange>("30D");
  const period = DASHBOARD_RANGES.find((r) => r.key === range)!;

  function pickRange(next: DashboardRange) {
    setRange(next);
    setChartRange(DASHBOARD_RANGES.find((r) => r.key === next)!.chart);
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Good evening, <GreetingName fallback={userName} />
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            Here&apos;s what&apos;s happening with your business today.
          </p>
        </div>

        <RangeMenu value={range} onChange={pickRange} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS_BY_RANGE[range].map((stat) => (
          <StatCard key={stat.label} stat={stat} compare={period.compare} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SalesOverview
          className="xl:col-span-2"
          range={chartRange}
          onRangeChange={setChartRange}
        />
        <RevenueBreakdown range={range} onRangeChange={pickRange} />
      </div>
    </>
  );
}
