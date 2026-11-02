import type { Metadata } from "next";

import { DEMO_CUSTOMERS } from "@/components/contacts/customers-data";
import { CustomersScreen } from "@/components/contacts/customers-screen";
import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Customers",
};

/** Contacts -> Customers. A static preview for now, like Users. */
export default function CustomersPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Customers" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Customers</h1>
          <p className="mt-1 text-[13px] text-muted">
            Manage your customers, their balances and dues.
          </p>
        </div>

        <CustomersScreen customers={DEMO_CUSTOMERS} />
      </div>
    </ConsoleShell>
  );
}
