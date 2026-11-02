import type { Metadata } from "next";
import Link from "next/link";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { ProductForm } from "@/components/inventory/product-form";
import { ConsoleShell } from "@/components/shell/console-shell";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Add product",
};

/** Inventory -> Add Product. Saves into the shared demo product store for now. */
export default function AddProductPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Add product" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-[13px] text-muted transition-colors hover:text-foreground"
          >
            <Icon name="chevron-left" className="h-4 w-4" />
            Products
          </Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Add new product</h1>
          <p className="mt-1 text-[13px] text-muted">
            Details, pricing and shelf location — opening stock comes next.
          </p>
        </div>

        <ProductForm />
      </div>
    </ConsoleShell>
  );
}
