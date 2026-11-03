import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { PurchaseReturnForm } from "@/components/purchases/purchase-return-form";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Add purchase return",
};

/** Purchases -> Add purchase return; `?purchase=<id>` returns goods from that purchase. */
export default async function AddPurchaseReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ purchase?: string }>;
}) {
  const { user, store, today } = DEMO_SESSION;
  const { purchase } = await searchParams;

  return (
    <ConsoleShell section="Add purchase return" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Add purchase return</h1>
          <p className="mt-1 text-[13px] text-muted">Send goods back to a supplier. They come out of stock when you submit.</p>
        </div>

        <PurchaseReturnForm key={purchase ?? "new"} purchaseId={Number(purchase) || undefined} />
      </div>
    </ConsoleShell>
  );
}
