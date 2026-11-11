"use client";

/**
 * View Contact -> Sales tab, laid out like the old Opal POS one: payment
 * status / date range / subscriptions filters above a sales table with an
 * Actions menu per row and a totals row (status and method counts, money
 * totals).
 *
 * Rows come from the demo ledger, so they agree with the Ledger tab.
 */

import { useMemo, useState } from "react";

import {
  ASSIGNABLE_USERS,
  DEMO_TODAY,
  type DemoCustomer,
} from "@/components/contacts/customers-data";
import { invoices, type Invoice, type LedgerEntry } from "@/components/contacts/ledger";
import { ActionsMenu } from "@/components/ui/actions-menu";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

type SaleRow = Invoice & {
  customerName: string;
  mobile: string | null;
  items: number;
  addedBy: string;
};

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
// UTC so the server and the browser print the same values
const DATE_TIME = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

const STATUS_TONE = { Paid: "green", Partial: "amber", Due: "rose" } as const;
const OVERDUE_AFTER_DAYS = 30;

const due = (r: SaleRow) => Math.max(0, Math.round((r.total - r.paid) * 100) / 100);
const sum = (rows: SaleRow[], pick: (r: SaleRow) => number) =>
  rows.reduce((t, r) => t + pick(r), 0);
/** "Paid - 2 · Partial - 1", like the old totals row. */
const counts = (values: (string | null)[]) =>
  Object.entries(
    values.reduce<Record<string, number>>((acc, v) => {
      if (v) acc[v] = (acc[v] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([label, n]) => (
    <span key={label} className="block whitespace-nowrap">
      {label} - {n}
    </span>
  ));

const dash = <span className="text-muted">-</span>;

const COLUMNS: DataColumn<SaleRow>[] = [
  {
    key: "date",
    label: "Date",
    sortValue: (r) => r.date,
    text: (r) => DATE_TIME.format(new Date(`${r.date}Z`)),
    render: (r) => <span className="text-muted">{DATE_TIME.format(new Date(`${r.date}Z`))}</span>,
  },
  {
    key: "invoice",
    label: "Invoice no.",
    sortValue: (r) => r.ref,
    text: (r) => r.ref,
    render: (r) => <span className="font-mono text-xs">{r.ref}</span>,
  },
  { key: "customer", label: "Customer name", sortValue: (r) => r.customerName, text: (r) => r.customerName },
  {
    key: "contact",
    label: "Contact number",
    sortValue: (r) => r.mobile ?? "",
    text: (r) => r.mobile ?? "",
    render: (r) => r.mobile ?? dash,
  },
  { key: "location", label: "Location", sortValue: (r) => r.location, text: (r) => r.location },
  {
    key: "status",
    label: "Payment status",
    sortValue: (r) => r.status,
    text: (r) => r.status,
    render: (r) => <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>,
    total: (rows) => counts(rows.map((r) => r.status)),
  },
  {
    key: "method",
    label: "Payment method",
    sortValue: (r) => r.method ?? "",
    text: (r) => r.method ?? "",
    render: (r) => r.method ?? dash,
    total: (rows) => counts(rows.map((r) => r.method)),
  },
  {
    key: "total",
    label: "Total amount",
    sortValue: (r) => r.total,
    text: (r) => r.total.toFixed(2),
    render: (r) => USD.format(r.total),
    align: "right",
    total: (rows) => USD.format(sum(rows, (r) => r.total)),
  },
  {
    key: "paid",
    label: "Total paid",
    sortValue: (r) => r.paid,
    text: (r) => r.paid.toFixed(2),
    render: (r) => USD.format(r.paid),
    align: "right",
    total: (rows) => USD.format(sum(rows, (r) => r.paid)),
  },
  {
    key: "due",
    label: "Sell due",
    sortValue: due,
    text: (r) => due(r).toFixed(2),
    render: (r) => (
      <span className={cn(due(r) > 0 ? "font-medium text-rose-600" : "text-muted")}>
        {USD.format(due(r))}
      </span>
    ),
    align: "right",
    total: (rows) => USD.format(sum(rows, due)),
  },
  {
    // returns aren't tied to a single invoice in the demo data
    key: "returnDue",
    label: "Sell return due",
    sortValue: () => 0,
    text: () => "",
    render: () => dash,
    align: "right",
    total: () => USD.format(0),
  },
  { key: "shipping", label: "Shipping status", sortValue: () => "", text: () => "", render: () => dash },
  {
    key: "items",
    label: "Total items",
    sortValue: (r) => r.items,
    text: (r) => r.items.toFixed(2),
    align: "right",
  },
  { key: "addedBy", label: "Added by", sortValue: (r) => r.addedBy, text: (r) => r.addedBy },
  { key: "sellNote", label: "Sell note", sortValue: () => "", text: () => "", render: () => dash },
  { key: "staffNote", label: "Staff note", sortValue: () => "", text: () => "", render: () => dash },
  { key: "shippingDetails", label: "Shipping details", sortValue: () => "", text: () => "", render: () => dash },
];

/** Unpaid (or part paid) and older than the overdue window. */
function isOverdue(r: SaleRow) {
  const age = (new Date(`${DEMO_TODAY}T00:00Z`).getTime() - new Date(`${r.date}Z`).getTime()) / 86_400_000;
  return r.status !== "Paid" && age > OVERDUE_AFTER_DAYS;
}

export function CustomerSalesTab({
  customer,
  ledger,
}: {
  customer: DemoCustomer;
  ledger: LedgerEntry[];
}) {
  const year = ledger[0].date.slice(0, 4);
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(`${year}-12-31`);
  const [subscriptions, setSubscriptions] = useState(false);

  const all = useMemo<SaleRow[]>(() => {
    const addedBy =
      ASSIGNABLE_USERS.find((u) => u.id === customer.assignedTo)?.name ?? "Adnan Ahmed";
    return invoices(ledger).map((inv) => ({
      ...inv,
      customerName: customer.name,
      mobile: customer.mobile,
      // demo: a small item count derived from the amount
      items: 1 + (Math.round(inv.total) % 4),
      addedBy,
    }));
  }, [customer, ledger]);

  const rows = all.filter(
    (r) =>
      r.date.slice(0, 10) >= from &&
      r.date.slice(0, 10) <= to &&
      // no subscription (recurring) invoices exist in the demo data
      !subscriptions &&
      (!status || (status === "Overdue" ? isOverdue(r) : r.status === status)),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-line bg-surface/50 p-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Payment status</span>
          <span className="relative">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-44 appearance-none rounded-lg border border-line bg-background px-3 py-2 pr-9 text-[13px] outline-none focus:border-brand-500"
            >
              <option value="">All</option>
              <option>Paid</option>
              <option>Due</option>
              <option>Partial</option>
              <option>Overdue</option>
            </select>
            <Icon
              name="chevron-down"
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            />
          </span>
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Date range</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              aria-label="From"
              value={from}
              onChange={(event) => event.target.value && setFrom(event.target.value)}
              className="rounded-lg border border-line bg-background px-3 py-1.5 text-[13px] outline-none focus:border-brand-500"
            />
            <span className="text-muted">-</span>
            <input
              type="date"
              aria-label="To"
              value={to}
              onChange={(event) => event.target.value && setTo(event.target.value)}
              className="rounded-lg border border-line bg-background px-3 py-1.5 text-[13px] outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 pb-2 text-[13px] text-muted hover:text-foreground">
          <input
            type="checkbox"
            checked={subscriptions}
            onChange={(event) => setSubscriptions(event.target.checked)}
            className="h-4 w-4 accent-brand-500"
          />
          Subscriptions
        </label>
      </div>

      <DataTable
        title="Sales"
        subtitle={`${rows.length} ${rows.length === 1 ? "sale" : "sales"} for ${customer.name}`}
        rows={rows}
        columns={COLUMNS}
        rowKey={(r) => r.ref}
        defaultSort={{ key: "date", direction: "desc" }}
        defaultPageSize={100}
        noun="sales"
        exportName={`sales-${customer.contactId}`}
        minWidth={2100}
        actionsPosition="start"
        actions={(r) => (
          // the sale screens behind these aren't built yet
          <ActionsMenu
            label={`Actions for ${r.ref}`}
            actions={[
              { label: "View", icon: "eye" },
              { label: "Print invoice", icon: "printer" },
              { label: "Edit", icon: "pencil" },
              { label: "Add payment", icon: "dollar" },
              { label: "View payments", icon: "receipt" },
              { label: "Sell return", icon: "refund" },
              { label: "Delete", icon: "trash", danger: true, dividerBefore: true },
            ]}
          />
        )}
      />
    </div>
  );
}
