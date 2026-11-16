import type { Metadata } from "next";

import { AttentionList } from "@/components/dashboard/attention-list";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * Business dashboard, fully static for now.
 *
 * No fetch: all content comes from `components/dashboard/dashboard-data.ts`.
 * When the backend is ready that file is swapped for hooks; the markup stays.
 */
export default function DashboardPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Overview" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <DashboardOverview userName={user.name} />

        <div className="grid gap-4 xl:grid-cols-3">
          <AttentionList />
          <RecentOrders className="xl:col-span-2" />
        </div>
      </div>
    </ConsoleShell>
  );
}
