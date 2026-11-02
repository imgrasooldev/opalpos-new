import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { PriceGroupsScreen } from "@/components/inventory/price-groups-screen";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Selling price groups",
};

/** Inventory -> Selling Price Group. */
export default function SellingPriceGroupsPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Selling price groups" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Selling price groups</h1>
          <p className="mt-1 text-[13px] text-muted">
            Different prices for different customers — like wholesale or VIP.
          </p>
        </div>

        <PriceGroupsScreen />
      </div>
    </ConsoleShell>
  );
}
