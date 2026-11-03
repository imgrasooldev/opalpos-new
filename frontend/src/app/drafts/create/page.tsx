import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { SaleForm } from "@/components/sales/sale-form";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Add draft",
};

/** Sell -> Add draft: the sale form without status or payment. */
export default function AddDraftPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Add draft" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Add draft</h1>
          <p className="mt-1 text-[13px] text-muted">Put a sale on hold. Nothing comes out of stock until it&apos;s converted.</p>
        </div>

        <SaleForm mode="Draft" />
      </div>
    </ConsoleShell>
  );
}
