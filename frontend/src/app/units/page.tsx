import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { UnitsScreen } from "@/components/inventory/units-screen";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Units",
};

/** Inventory -> Units. */
export default function UnitsPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Units" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Units</h1>
          <p className="mt-1 text-[13px] text-muted">Manage your units.</p>
        </div>

        <UnitsScreen />
      </div>
    </ConsoleShell>
  );
}
