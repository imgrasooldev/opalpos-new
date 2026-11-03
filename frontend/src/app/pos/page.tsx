import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { SalesScreen } from "@/components/sales/sales-screen";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "POS",
};

/** Sell -> List POS: the sales rung up at the POS. */
export default function PosListPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="POS" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">POS</h1>
          <p className="mt-1 text-[13px] text-muted">Sales rung up at the counter.</p>
        </div>

        <SalesScreen pos />
      </div>
    </ConsoleShell>
  );
}
