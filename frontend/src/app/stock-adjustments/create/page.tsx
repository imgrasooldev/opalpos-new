import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { ConsoleShell } from "@/components/shell/console-shell";
import { AdjustmentForm } from "@/components/stock-adjustments/adjustment-form";

export const metadata: Metadata = {
  title: "Add stock adjustment",
};

/** Stock Adjustment -> Add stock adjustment. */
export default function AddStockAdjustmentPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Add stock adjustment" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Add stock adjustment</h1>
          <p className="mt-1 text-[13px] text-muted">Take damaged, lost or stolen stock out of a location.</p>
        </div>

        <AdjustmentForm />
      </div>
    </ConsoleShell>
  );
}
