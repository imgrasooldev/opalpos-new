import type { Metadata } from "next";
import Link from "next/link";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { OpeningStock } from "@/components/inventory/opening-stock";
import { ConsoleShell } from "@/components/shell/console-shell";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Update & edit quantity",
};

/**
 * Opening stock for a product — opened after "Save" on Add product, and from
 * "Add stock" / "Edit opening stock" in the products list.
 */
export default async function OpeningStockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Opening stock" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-[13px] text-muted transition-colors hover:text-foreground"
          >
            <Icon name="chevron-left" className="h-4 w-4" />
            Products
          </Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Update &amp; edit quantity</h1>
          <p className="mt-1 text-[13px] text-muted">
            Set how much of this product you have at each location.
          </p>
        </div>

        <OpeningStock id={Number(id)} />
      </div>
    </ConsoleShell>
  );
}
