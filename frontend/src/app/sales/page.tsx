import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { SalesScreen } from "@/components/sales/sales-screen";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Sales",
};

/** Sell -> All sales; `?print=<id>` opens and prints a sale ("Save and print"), `?view=<id>` opens it. */
export default async function SalesPage({ searchParams }: { searchParams: Promise<{ print?: string; view?: string }> }) {
  const { user, store, today } = DEMO_SESSION;
  const { print, view } = await searchParams;

  return (
    <ConsoleShell section="Sales" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Sales</h1>
          <p className="mt-1 text-[13px] text-muted">Every final sale, what was paid and what&apos;s still due.</p>
        </div>

        <SalesScreen
          key={print ?? view ?? "list"}
          printId={Number(print) || undefined}
          viewId={Number(view) || undefined}
        />
      </div>
    </ConsoleShell>
  );
}
