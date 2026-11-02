import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { ProductsScreen } from "@/components/inventory/products-screen";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Products",
};

/**
 * Inventory -> List Products. A static preview for now, like the other
 * console screens; the API hooks in `hooks/use-products.ts` plug in later.
 */
export default function ProductsPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Products" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Products</h1>
          <p className="mt-1 text-[13px] text-muted">
            Manage your products, their locations and stock.
          </p>
        </div>

        <ProductsScreen />
      </div>
    </ConsoleShell>
  );
}
