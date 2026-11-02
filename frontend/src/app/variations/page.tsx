import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { VariationsScreen } from "@/components/inventory/variations-screen";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Variations",
};

/** Inventory -> Variations (variation templates). */
export default function VariationsPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Variations" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Variations</h1>
          <p className="mt-1 text-[13px] text-muted">
            Manage product variations — reusable lists like colors or sizes.
          </p>
        </div>

        <VariationsScreen />
      </div>
    </ConsoleShell>
  );
}
