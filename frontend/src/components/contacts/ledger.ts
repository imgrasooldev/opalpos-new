/**
 * Demo ledger for a customer: an opening balance row, then sells and their
 * payments in date order.
 *
 * Generated from the customer's id (so it's the same on every load) and shaped
 * to match the list screen: sells and payments end exactly at `saleDue` (the
 * last sale is left partly paid, or overpaid, by that amount), and unpaid
 * sell returns add up to `sellReturnDue`. Replaced by the ledger endpoint once
 * it exists.
 */

import type { DemoCustomer } from "@/components/contacts/customers-data";

export type LedgerEntry = {
  id: string;
  /** ISO date-time. */
  date: string;
  ref: string;
  type: "Opening Balance" | "Sell" | "Payment" | "Sell Return";
  location: string | null;
  paymentStatus: "Paid" | "Partial" | "Due" | null;
  debit: number;
  credit: number;
  method: string | null;
  /** Invoice a payment belongs to. */
  forInvoice: string | null;
};

export type Invoice = {
  ref: string;
  date: string;
  location: string;
  total: number;
  paid: number;
  status: "Paid" | "Partial" | "Due";
  /** How it was paid; "Multiple" if split, null if nothing paid yet. */
  method: string | null;
};

export const LOCATIONS = ["GR Store", "City Outlet"];

const round = (n: number) => Math.round(n * 100) / 100;

/** Small deterministic generator — same customer, same ledger. */
function seeded(seed: number) {
  let state = seed * 7919 + 13;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

export function buildLedger(customer: DemoCustomer): LedgerEntry[] {
  const year = (customer.lastSaleOn ?? customer.addedOn).slice(0, 4);
  const entries: LedgerEntry[] = [
    {
      id: "opening",
      date: `${year}-01-01T00:00`,
      ref: "",
      type: "Opening Balance",
      location: null,
      paymentStatus: null,
      debit: customer.openingBalance,
      credit: 0,
      method: null,
      forInvoice: null,
    },
  ];
  if (!customer.lastSaleOn) return entries;

  const random = seeded(customer.id);
  const count = 3 + Math.floor(random() * 4);
  const last = new Date(`${customer.lastSaleOn}T00:00Z`);

  for (let i = 0; i < count; i++) {
    // walk backwards from the last sale so the final entry lands on lastSaleOn
    const day = new Date(last);
    day.setUTCDate(day.getUTCDate() - (count - 1 - i) * (1 + Math.floor(random() * 5)));
    // never before the customer existed
    const added = new Date(`${customer.addedOn}T00:00Z`);
    if (day < added) day.setTime(added.getTime());
    const hour = 10 + Math.floor(random() * 9);
    const minute = Math.floor(random() * 60);
    const date = `${day.toISOString().slice(0, 10)}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    const isLast = i === count - 1;
    let amount = round(5 + random() * 180);
    // the last sale carries the outstanding due, so it must be big enough
    if (isLast && customer.saleDue > 0) amount = round(customer.saleDue + 25 + random() * 90);
    const paid = isLast ? round(amount - customer.saleDue) : amount;
    const location = LOCATIONS[random() < 0.65 ? 0 : 1];
    const invoice = `2026-0${94800 + customer.id * 10 + i}`;

    entries.push({
      id: `sell-${i}`,
      date,
      ref: invoice,
      type: "Sell",
      location,
      paymentStatus: paid >= amount ? "Paid" : paid > 0 ? "Partial" : "Due",
      debit: amount,
      credit: 0,
      method: null,
      forInvoice: null,
    });
    if (paid > 0) {
      entries.push({
        id: `pay-${i}`,
        date,
        ref: `SP2026/${47400 + customer.id * 10 + i}`,
        type: "Payment",
        location,
        paymentStatus: null,
        debit: 0,
        credit: paid,
        method: random() < 0.7 ? "Cash" : "Card",
        forInvoice: invoice,
      });
    }
  }
  // unpaid sell returns: credits the business still owes back, after the last sale
  if (customer.sellReturnDue > 0) {
    const parts = 1 + Math.floor(random() * 3);
    let left = customer.sellReturnDue;
    for (let i = 0; i < parts; i++) {
      const amount = i === parts - 1 ? round(left) : round(customer.sellReturnDue / parts);
      left = round(left - amount);
      const day = new Date(last);
      day.setUTCDate(day.getUTCDate() + Math.min(i, 1));
      entries.push({
        id: `return-${i}`,
        date: `${day.toISOString().slice(0, 10)}T${String(19 + i).padStart(2, "0")}:${String(10 + i * 7).padStart(2, "0")}`,
        ref: `CN2026/${String(80 + customer.id * 3 + i).padStart(4, "0")}`,
        type: "Sell Return",
        location: LOCATIONS[i % 2],
        paymentStatus: "Due",
        debit: 0,
        credit: amount,
        method: null,
        forInvoice: null,
      });
    }
  }

  // clamped days can share a date; sort is stable, so each payment stays after its sale
  entries.sort((a, b) => a.date.localeCompare(b.date));

  // number invoices and payments in date order, as a real ledger would read
  const renamed = new Map<string, string>();
  let n = 0;
  for (const entry of entries) {
    if (entry.type !== "Sell") continue;
    const ref = `2026-0${94800 + customer.id * 10 + n}`;
    renamed.set(entry.ref, ref);
    entry.ref = ref;
    n += 1;
  }
  for (const entry of entries) {
    if (entry.type !== "Payment" || !entry.forInvoice) continue;
    entry.forInvoice = renamed.get(entry.forInvoice)!;
    entry.ref = `SP2026/${47400 + customer.id * 10 + Number(entry.forInvoice.slice(-1))}`;
  }
  return entries;
}

/** Sells with what was paid against each — Format 2 and the Sales tab. */
export function invoices(entries: LedgerEntry[]): Invoice[] {
  return entries
    .filter((e) => e.type === "Sell")
    .map((sell) => {
      const payments = entries.filter((e) => e.forInvoice === sell.ref);
      const paid = round(payments.reduce((t, e) => t + e.credit, 0));
      const methods = [...new Set(payments.map((p) => p.method))];
      return {
        ref: sell.ref,
        date: sell.date,
        location: sell.location!,
        total: sell.debit,
        paid,
        status: sell.paymentStatus!,
        method: methods.length > 1 ? "Multiple" : (methods[0] ?? null),
      };
    });
}
