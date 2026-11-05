import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { PurchasesScreen } from "@/components/purchases/purchases-screen";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Purchases",
};

/** Purchases -> List purchases; `?view=<id>` opens that purchase. */
export default async function PurchasesPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { user, store, today } = DEMO_SESSION;
  const { view } = await searchParams;

  return (
    <ConsoleShell section="Purchases" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Purchases</h1>
          <p className="mt-1 text-[13px] text-muted">Stock you bought from suppliers, and what you still owe.</p>
        </div>

        <PurchasesScreen key={view ?? "list"} viewId={Number(view) || undefined} />
      </div>
    </ConsoleShell>
  );
}
