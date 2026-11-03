import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { DraftsScreen } from "@/components/sales/drafts-screen";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Quotations",
};

/** Sell -> List quotations. */
export default function QuotationsPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Quotations" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">List quotations</h1>
          <p className="mt-1 text-[13px] text-muted">Price offers for customers. They don&apos;t touch stock until converted.</p>
        </div>

        <DraftsScreen kind="Quotation" />
      </div>
    </ConsoleShell>
  );
}
