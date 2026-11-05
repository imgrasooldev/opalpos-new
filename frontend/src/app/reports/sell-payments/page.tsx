import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { SellPaymentReport } from "@/components/reports/sell-payment-report";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Sell payment report",
};

/** Reports -> Sell payment report. */
export default function SellPaymentReportPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Sell payment report" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Sell payment report</h1>
          <p className="mt-1 text-[13px] text-muted">Every payment taken on sales, with who paid and how.</p>
        </div>

        <SellPaymentReport />
      </div>
    </ConsoleShell>
  );
}
