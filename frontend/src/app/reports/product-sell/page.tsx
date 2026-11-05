import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { ProductSellReport } from "@/components/reports/product-sell-report";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Product sell report",
};

/** Reports -> Product sell report. */
export default function ProductSellReportPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Product sell report" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Product sell report</h1>
          <p className="mt-1 text-[13px] text-muted">Every product sold: who bought it, on which invoice, and for how much.</p>
        </div>

        <ProductSellReport />
      </div>
    </ConsoleShell>
  );
}
