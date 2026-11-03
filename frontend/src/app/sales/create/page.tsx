import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { SaleForm } from "@/components/sales/sale-form";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Add sale",
};

/** Sell -> Add sale. */
export default function AddSalePage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Add sale" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Add sale</h1>
          <p className="mt-1 text-[13px] text-muted">Sell to a customer. A Final sale takes the products out of stock.</p>
        </div>

        <SaleForm />
      </div>
    </ConsoleShell>
  );
}
