import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { StockReport } from "@/components/reports/stock-report";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Stock report",
};

/** Reports -> Stock report. */
export default function StockReportPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Stock report" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Stock report</h1>
          <p className="mt-1 text-[13px] text-muted">Current stock, its value, and what was sold, transferred and adjusted.</p>
        </div>

        <StockReport />
      </div>
    </ConsoleShell>
  );
}
