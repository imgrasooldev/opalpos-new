import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { BrandsScreen } from "@/components/inventory/brands-screen";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Brands",
};

/** Inventory -> Brands. */
export default function BrandsPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Brands" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Brands</h1>
          <p className="mt-1 text-[13px] text-muted">Manage your brands.</p>
        </div>

        <BrandsScreen />
      </div>
    </ConsoleShell>
  );
}
