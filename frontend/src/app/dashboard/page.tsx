import type { Metadata } from "next";

import { AttentionList } from "@/components/dashboard/attention-list";
import { DEMO_SESSION, STATS } from "@/components/dashboard/dashboard-data";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { RevenueBreakdown } from "@/components/dashboard/revenue-breakdown";
import { SalesOverview } from "@/components/dashboard/sales-overview";
import { StatCard } from "@/components/dashboard/stat-card";
import { ConsoleShell } from "@/components/shell/console-shell";
import { Icon } from "@/components/ui/icon";
import { buttonStyles } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * Business dashboard — abhi poori tarah static preview hai.
 *
 * Na `AuthGuard` lagi hai aur na koi fetch: saara content
 * `components/dashboard/dashboard-data.ts` se aata hai. Backend ready hone par
 * wahi file hooks se badalni hai, screen ka markup wahi rahega.
 */
export default function DashboardPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Overview" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Good evening, {user.name}
            </h1>
            <p className="mt-1 text-[13px] text-muted">
              Here&apos;s what&apos;s happening with your business today.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-line bg-background px-3 py-2 text-[13px] transition-colors hover:bg-surface"
            >
              <Icon name="calendar" className="h-4 w-4 text-muted" />
              Last 30 days
              <Icon name="chevron-down" className="h-4 w-4 text-muted" />
            </button>

            <button
              type="button"
              className={buttonStyles({
                variant: "accent",
                className: "bg-plum-500 hover:bg-plum-600",
              })}
            >
              <Icon name="plus" className="h-4 w-4" />
              New sale
              <Icon name="chevron-down" className="h-4 w-4 opacity-80" />
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STATS.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <SalesOverview className="xl:col-span-2" />
          <RevenueBreakdown />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <AttentionList />
          <RecentOrders className="xl:col-span-2" />
        </div>
      </div>
    </ConsoleShell>
  );
}
