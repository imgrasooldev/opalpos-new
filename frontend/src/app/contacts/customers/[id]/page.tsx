import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DEMO_CUSTOMERS } from "@/components/contacts/customers-data";
import { tabFromParam } from "@/components/contacts/customer-tabs";
import { CustomerView } from "@/components/contacts/customer-view";
import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { ConsoleShell } from "@/components/shell/console-shell";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "View contact",
};

/**
 * Contacts -> Customers -> View. `?tab=sales` (etc.) opens a specific tab, so
 * the list's Actions menu can link straight to Ledger or Sales.
 */
export default async function ViewCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const customer = DEMO_CUSTOMERS.find((c) => c.id === Number(id));
  if (!customer) notFound();

  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="View contact" store={store} user={user} today={today}>
      <div className="flex flex-col gap-4">
        <Link
          href="/contacts/customers"
          className="inline-flex w-fit items-center gap-1 text-[13px] text-muted transition-colors hover:text-foreground"
        >
          <Icon name="chevron-left" className="h-4 w-4" />
          Customers
        </Link>

        {/* key resets tab/filters when switching to another contact */}
        <CustomerView
          key={customer.id}
          customer={customer}
          initialTab={tabFromParam(tab)}
          contacts={DEMO_CUSTOMERS.map((c) => ({ id: c.id, name: c.name, contactId: c.contactId }))}
        />
      </div>
    </ConsoleShell>
  );
}
