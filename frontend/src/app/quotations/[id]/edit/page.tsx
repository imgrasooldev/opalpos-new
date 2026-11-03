import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { DraftEdit } from "@/components/sales/draft-edit";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Edit quotation",
};

/** Sell -> List quotations -> Edit. */
export default async function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, store, today } = DEMO_SESSION;
  const { id } = await params;

  return (
    <ConsoleShell section="Edit quotation" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Edit quotation</h1>
          <p className="mt-1 text-[13px] text-muted">Change the quotation. It still won&apos;t touch stock.</p>
        </div>

        <DraftEdit key={id} id={Number(id)} kind="Quotation" />
      </div>
    </ConsoleShell>
  );
}
