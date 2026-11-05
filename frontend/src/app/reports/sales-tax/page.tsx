import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { SalesTaxReport } from "@/components/reports/sales-tax-report";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Sales tax report",
};

/** Reports -> Sales tax report. */
export default function SalesTaxReportPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Sales tax report" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Sales tax report</h1>
          <p className="mt-1 text-[13px] text-muted">Tax details for the selected date range.</p>
        </div>

        <SalesTaxReport />
      </div>
    </ConsoleShell>
  );
}
