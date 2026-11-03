import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { PurchaseReturnsScreen } from "@/components/purchases/purchase-returns-screen";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Purchase return",
};

/** Purchases -> List purchase return. */
export default function PurchaseReturnsPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Purchase return" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Purchase return</h1>
          <p className="mt-1 text-[13px] text-muted">Goods sent back to suppliers, and what they still owe you.</p>
        </div>

        <PurchaseReturnsScreen />
      </div>
    </ConsoleShell>
  );
}
