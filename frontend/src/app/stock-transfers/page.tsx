import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { ConsoleShell } from "@/components/shell/console-shell";
import { TransfersScreen } from "@/components/stock-transfers/transfers-screen";

export const metadata: Metadata = {
  title: "Stock transfers",
};

/** Stock Transfers -> List stock transfers. */
export default function StockTransfersPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Stock transfers" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Stock transfers</h1>
          <p className="mt-1 text-[13px] text-muted">Stock moved between your business locations.</p>
        </div>

        <TransfersScreen />
      </div>
    </ConsoleShell>
  );
}
