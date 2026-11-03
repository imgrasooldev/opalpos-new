import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { DiscountsScreen } from "@/components/sales/discounts-screen";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Discounts",
};

/** Sell -> Discounts. */
export default function DiscountsPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Discounts" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Discount</h1>
          <p className="mt-1 text-[13px] text-muted">Automatic product discounts by location and date.</p>
        </div>

        <DiscountsScreen />
      </div>
    </ConsoleShell>
  );
}
