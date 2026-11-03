import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { ConsoleShell } from "@/components/shell/console-shell";
import { AdjustmentsScreen } from "@/components/stock-adjustments/adjustments-screen";

export const metadata: Metadata = {
  title: "Stock adjustments",
};

/** Stock Adjustment -> List stock adjustments. */
export default function StockAdjustmentsPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Stock adjustments" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Stock adjustments</h1>
          <p className="mt-1 text-[13px] text-muted">Stock written off for damage, leakage, theft or loss.</p>
        </div>

        <AdjustmentsScreen />
      </div>
    </ConsoleShell>
  );
}
