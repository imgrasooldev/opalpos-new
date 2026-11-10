import type { Metadata } from "next";

import { BillingScreen } from "@/components/platform/billing-screen";
import { PlatformPage } from "@/components/platform/platform-page";

export const metadata: Metadata = {
  title: "Billing",
};

/** Platform admin -> Billing; `?business=<id>` and `?status=Overdue` open filtered. */
export default async function BillingPage({ searchParams }: { searchParams: Promise<{ business?: string; status?: string }> }) {
  const { business, status } = await searchParams;
  return (
    <PlatformPage section="Billing" title="Billing" description="Invoices, payments and renewals. Unpaid invoices get reminders, a grace period, then suspension.">
      <BillingScreen key={`${business ?? ""}-${status ?? ""}`} initialBusiness={business} initialStatus={status} />
    </PlatformPage>
  );
}
