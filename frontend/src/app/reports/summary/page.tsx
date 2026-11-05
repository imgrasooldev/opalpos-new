import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { SummaryReport } from "@/components/reports/summary-report";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Summary report",
};

/** Reports -> Summary report. */
export default function SummaryReportPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Summary report" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Summary report</h1>
          <p className="mt-1 text-[13px] text-muted">Sales, taxes, payments, stock value and the cash drawer for the selected date range.</p>
        </div>

        <SummaryReport />
      </div>
    </ConsoleShell>
  );
}
