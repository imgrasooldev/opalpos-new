import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { TrendingProducts } from "@/components/reports/trending-products";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Trending products",
};

/** Reports -> Trending products. */
export default function TrendingProductsPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Trending products" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Trending products</h1>
          <p className="mt-1 text-[13px] text-muted">Your best selling products by units sold.</p>
        </div>

        <TrendingProducts />
      </div>
    </ConsoleShell>
  );
}
