import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { SalesImport } from "@/components/sales/sales-import";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Import sales",
};

/** Sell -> Import sales. */
export default function ImportSalesPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Import sales" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Import sales</h1>
          <p className="mt-1 text-[13px] text-muted">Bring in sales from a file. Each import can be reverted.</p>
        </div>

        <SalesImport />
      </div>
    </ConsoleShell>
  );
}
