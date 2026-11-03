import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { ConsoleShell } from "@/components/shell/console-shell";
import { TransferForm } from "@/components/stock-transfers/transfer-form";

export const metadata: Metadata = {
  title: "Add stock transfer",
};

/** Stock Transfers -> Add stock transfer. */
export default function AddStockTransferPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Add stock transfer" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Add stock transfer</h1>
          <p className="mt-1 text-[13px] text-muted">Move stock from one location to another.</p>
        </div>

        <TransferForm />
      </div>
    </ConsoleShell>
  );
}
