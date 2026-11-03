import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { PurchasesScreen } from "@/components/purchases/purchases-screen";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Purchases",
};

/** Purchases -> List purchases. */
export default function PurchasesPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Purchases" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Purchases</h1>
          <p className="mt-1 text-[13px] text-muted">Stock you bought from suppliers, and what you still owe.</p>
        </div>

        <PurchasesScreen />
      </div>
    </ConsoleShell>
  );
}
