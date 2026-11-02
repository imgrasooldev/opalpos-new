import type { Metadata } from "next";
import Link from "next/link";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { EditProduct } from "@/components/inventory/edit-product";
import { ConsoleShell } from "@/components/shell/console-shell";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Edit product",
};

/** Inventory -> Products -> Edit. Same form as Add product, filled in. */
export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Edit product" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-[13px] text-muted transition-colors hover:text-foreground"
          >
            <Icon name="chevron-left" className="h-4 w-4" />
            Products
          </Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Edit product</h1>
          <p className="mt-1 text-[13px] text-muted">Change details, pricing and variations.</p>
        </div>

        <EditProduct id={Number(id)} />
      </div>
    </ConsoleShell>
  );
}
