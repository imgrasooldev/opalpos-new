import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { SellReturnsScreen } from "@/components/sales/sell-returns-screen";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Sell return",
};

/** Sell -> List sell return. */
export default function SellReturnsPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Sell return" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Sell return</h1>
          <p className="mt-1 text-[13px] text-muted">Goods customers brought back, and what you still owe them.</p>
        </div>

        <SellReturnsScreen />
      </div>
    </ConsoleShell>
  );
}
