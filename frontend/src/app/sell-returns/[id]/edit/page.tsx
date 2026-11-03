import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { SellReturnEdit } from "@/components/sales/sell-return-edit";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Edit sell return",
};

/** Sell -> List sell return -> Edit. */
export default async function EditSellReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, store, today } = DEMO_SESSION;
  const { id } = await params;

  return (
    <ConsoleShell section="Sell return" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Sell return</h1>
          <p className="mt-1 text-[13px] text-muted">Change what the customer brought back. Stock follows the new quantities.</p>
        </div>

        <SellReturnEdit key={id} id={Number(id)} />
      </div>
    </ConsoleShell>
  );
}
