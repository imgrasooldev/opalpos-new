import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { PurchaseSaleReport } from "@/components/reports/purchase-sale-report";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Purchase & sale report",
};

/** Reports -> Purchase & sale report. */
export default function PurchaseSaleReportPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Purchase & sale report" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Purchase &amp; sale report</h1>
          <p className="mt-1 text-[13px] text-muted">Purchase &amp; sale details for the selected date range.</p>
        </div>

        <PurchaseSaleReport />
      </div>
    </ConsoleShell>
  );
}
