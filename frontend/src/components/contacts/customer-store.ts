"use client";

/**
 * Customers shared by the Customers screen and Add sale, so a customer added
 * from a sale (the "+" next to Customer) shows up in the list too.
 *
 * STAND-IN FOR THE API — replaced by the contacts endpoint later.
 */

import { DEMO_CUSTOMERS, type DemoCustomer } from "@/components/contacts/customers-data";
import { createDemoStore } from "@/components/inventory/demo-store";

const store = createDemoStore<DemoCustomer>("opalpay.demo-customers", DEMO_CUSTOMERS);
export const useCustomers = store.use;
export const updateCustomers = store.update;

/** Next free numeric contact ID, e.g. "0014" — what "leave empty to autogenerate" does. */
export function nextContactId(customers: DemoCustomer[]) {
  const highest = Math.max(0, ...customers.map((c) => Number(c.contactId) || 0));
  return String(highest + 1).padStart(4, "0");
}
