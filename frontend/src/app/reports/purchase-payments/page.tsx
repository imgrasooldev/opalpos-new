import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { PurchasePaymentReport } from "@/components/reports/purchase-payment-report";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Purchase payment report",
};

/** Reports -> Purchase payment report. */
export default function PurchasePaymentReportPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Purchase payment report" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Purchase payment report</h1>
          <p className="mt-1 text-[13px] text-muted">Every payment made to suppliers for purchases.</p>
        </div>

        <PurchasePaymentReport />
      </div>
    </ConsoleShell>
  );
}
