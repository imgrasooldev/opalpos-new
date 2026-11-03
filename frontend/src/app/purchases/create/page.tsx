import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { PurchaseForm } from "@/components/purchases/purchase-form";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Add purchase",
};

/** Purchases -> Add purchase. */
export default function AddPurchasePage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Add purchase" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Add purchase</h1>
          <p className="mt-1 text-[13px] text-muted">Record stock bought from a supplier and what you paid.</p>
        </div>

        <PurchaseForm />
      </div>
    </ConsoleShell>
  );
}
