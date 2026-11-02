import type { Metadata } from "next";
import Link from "next/link";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { StockHistoryScreen } from "@/components/inventory/stock-history-screen";
import { ConsoleShell } from "@/components/shell/console-shell";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Product stock history",
};

/** Products -> Actions -> Product stock history. */
export default async function StockHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Stock history" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-[13px] text-muted transition-colors hover:text-foreground"
          >
            <Icon name="chevron-left" className="h-4 w-4" />
            Products
          </Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Product stock history</h1>
          <p className="mt-1 text-[13px] text-muted">What came in, what went out, and when.</p>
        </div>

        <StockHistoryScreen id={Number(id)} />
      </div>
    </ConsoleShell>
  );
}
