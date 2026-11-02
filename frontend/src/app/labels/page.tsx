import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { LabelsScreen } from "@/components/inventory/labels-screen";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Print labels",
};

/**
 * Inventory -> Print Labels. `?product_id=` starts with that product's
 * variations, which is how a product's Actions -> Labels opens it.
 */
export default async function PrintLabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ product_id?: string }>;
}) {
  const { product_id } = await searchParams;
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Print labels" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div className="print:hidden">
          <h1 className="text-xl font-semibold tracking-tight">Print labels</h1>
          <p className="mt-1 text-[13px] text-muted">
            Pick products, choose what each label shows, then preview and print.
          </p>
        </div>

        <LabelsScreen productId={product_id ? Number(product_id) : null} />
      </div>
    </ConsoleShell>
  );
}
