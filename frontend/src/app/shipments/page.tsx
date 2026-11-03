import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { ShipmentsScreen } from "@/components/sales/shipments-screen";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Shipments",
};

/** Sell -> Shipments. */
export default function ShipmentsPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Shipments" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Shipments</h1>
          <p className="mt-1 text-[13px] text-muted">Sales going out for delivery and where each one is.</p>
        </div>

        <ShipmentsScreen />
      </div>
    </ConsoleShell>
  );
}
