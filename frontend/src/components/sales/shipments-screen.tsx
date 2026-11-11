"use client";

/**
 * Sell -> Shipments, as in the old Opal POS: the Final sales that have a
 * shipping status, with location, customer, date range, user, payment status
 * and shipping status filters. No action column; the invoice number opens the
 * sale, and shipping is changed from All sales -> Edit shipping.
 */

import Link from "next/link";
import { useMemo, useState } from "react";

import { useCustomers } from "@/components/contacts/customer-store";
import { PRODUCT_LOCATIONS } from "@/components/inventory/products-data";
import {
  SHIPPING_STATUSES,
  salePaymentStatus,
  useSales,
  type Sale,
} from "@/components/sales/sales-data";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { DEMO_USERS } from "@/components/users/users-data";
import { cn } from "@/lib/cn";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const PAYMENT_TONE = { Paid: "green", Partial: "amber", Due: "rose" } as const;
const SHIPPING_TONE = { Ordered: "neutral", Packed: "amber", Shipped: "blue", Delivered: "green", Cancelled: "rose" } as const;
const dash = <span className="text-muted">-</span>;
const fieldClass =
  "w-full rounded-lg border bg-background py-2 text-[13px] outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25";

type Filters = { location: string; customer: string; from: string; to: string; user: string; payment: string; shipping: string };
const NO_FILTERS: Filters = { location: "", customer: "", from: "", to: "", user: "", payment: "", shipping: "" };

export function ShipmentsScreen() {
  const sales = useSales();
  const customers = useCustomers();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);

  const customerOf = (s: Sale) => customers.find((c) => c.id === s.customerId);
  const customerName = (s: Sale) => customerOf(s)?.name ?? "Unknown customer";
  const shipments = sales.filter((s) => s.status === "Final" && s.shippingStatus);
  const active = Object.entries(filters).filter(([k, v]) => v !== NO_FILTERS[k as keyof Filters]).length;

  const rows = useMemo(
    () =>
      sales.filter(
        (s) =>
          s.status === "Final" &&
          s.shippingStatus &&
          (!filters.location || s.location === filters.location) &&
          (!filters.customer || s.customerId === Number(filters.customer)) &&
          (!filters.from || s.date.slice(0, 10) >= filters.from) &&
          (!filters.to || s.date.slice(0, 10) <= filters.to) &&
          (!filters.user || s.addedBy === filters.user) &&
          (!filters.payment || salePaymentStatus(s) === filters.payment) &&
          (!filters.shipping || s.shippingStatus === filters.shipping),
      ),
    [sales, filters],
  );

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const columns: DataColumn<Sale>[] = [
    {
      key: "date",
      label: "Date",
      sortValue: (s) => s.date,
      text: (s) => `${day(s.date)} ${time(s.date)}`,
      render: (s) => (
        <span className="leading-tight">
          <span className="block">{day(s.date)}</span>
          <span className="block text-xs text-muted">{time(s.date)}</span>
        </span>
      ),
    },
    {
      key: "invoice",
      label: "Invoice no.",
      sortValue: (s) => s.invoiceNo,
      text: (s) => s.invoiceNo,
      render: (s) => (
        <Link href={`/sales?view=${s.id}`} className="font-mono text-[12.5px] font-medium text-brand-500 hover:underline">
          {s.invoiceNo}
        </Link>
      ),
    },
    {
      key: "customer",
      label: "Customer name",
      sortValue: customerName,
      text: customerName,
      render: (s) => <span className="font-medium">{customerName(s)}</span>,
    },
    {
      key: "contact",
      label: "Contact number",
      sortValue: (s) => customerOf(s)?.mobile ?? "",
      text: (s) => customerOf(s)?.mobile ?? "",
      render: (s) => customerOf(s)?.mobile ?? dash,
    },
    { key: "location", label: "Location", sortValue: (s) => s.location, text: (s) => s.location },
    {
      key: "shipping",
      label: "Shipping status",
      sortValue: (s) => s.shippingStatus ?? "",
      text: (s) => s.shippingStatus ?? "",
      render: (s) => (s.shippingStatus ? <Badge tone={SHIPPING_TONE[s.shippingStatus]}>{s.shippingStatus}</Badge> : dash),
    },
    {
      key: "payment",
      label: "Payment status",
      sortValue: salePaymentStatus,
      text: salePaymentStatus,
      render: (s) => <Badge tone={PAYMENT_TONE[salePaymentStatus(s)]}>{salePaymentStatus(s)}</Badge>,
    },
    {
      key: "address",
      label: "Shipping address",
      sortValue: (s) => s.shippingAddress,
      text: (s) => s.shippingAddress,
      render: (s) => s.shippingAddress || dash,
      defaultHidden: true,
    },
    {
      key: "deliveredTo",
      label: "Delivered to",
      sortValue: (s) => s.deliveredTo,
      text: (s) => s.deliveredTo,
      render: (s) => s.deliveredTo || dash,
      defaultHidden: true,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Card
        title={
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Icon name="filter" className="h-4 w-4 text-brand-500" />
            Filters
            {active > 0 && <span className="rounded-full bg-brand-500 px-1.5 text-[10.5px] font-medium text-white">{active}</span>}
          </h2>
        }
        action={
          active > 0 && (
            <button
              type="button"
              onClick={() => setFilters(NO_FILTERS)}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              Reset filters
            </button>
          )
        }
        bodyClassName="border-t border-line pt-4"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FilterSelect label="Business location" value={filters.location} onChange={(v) => set("location", v)} options={[{ value: "", label: "All" }, ...PRODUCT_LOCATIONS.map((l) => ({ value: l, label: l }))]} />
          <FilterSelect label="Customer" value={filters.customer} onChange={(v) => set("customer", v)} options={[{ value: "", label: "All" }, ...customers.map((c) => ({ value: String(c.id), label: c.name }))]} />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Date range</span>
            <div className="flex items-center gap-1.5">
              <input type="date" aria-label="From date" value={filters.from} onChange={(event) => set("from", event.target.value)} className={cn(fieldClass, "min-w-0 px-2", filters.from ? "border-brand-500/60" : "border-line")} />
              <span className="text-xs text-muted">to</span>
              <input type="date" aria-label="To date" value={filters.to} onChange={(event) => set("to", event.target.value)} className={cn(fieldClass, "min-w-0 px-2", filters.to ? "border-brand-500/60" : "border-line")} />
            </div>
          </div>
          <FilterSelect label="User" value={filters.user} onChange={(v) => set("user", v)} options={[{ value: "", label: "All" }, ...DEMO_USERS.map((u) => ({ value: u.name, label: u.name }))]} />
          <FilterSelect label="Payment status" value={filters.payment} onChange={(v) => set("payment", v)} options={[{ value: "", label: "All" }, ...["Paid", "Due", "Partial"].map((s) => ({ value: s, label: s }))]} />
          <FilterSelect label="Shipping status" value={filters.shipping} onChange={(v) => set("shipping", v)} options={[{ value: "", label: "All" }, ...SHIPPING_STATUSES.map((s) => ({ value: s, label: s }))]} />
        </div>
      </Card>

      <DataTable
        title="Shipments"
        subtitle={
          active > 0
            ? `${rows.length} of ${shipments.length} shipments match the filters`
            : `${shipments.length} shipments · sales with a shipping status`
        }
        rows={rows}
        columns={columns}
        rowKey={(s) => s.id}
        defaultSort={{ key: "date", direction: "desc" }}
        defaultPageSize={100}
        noun="shipments"
        exportName="shipments"
        minWidth={1000}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(fieldClass, "appearance-none px-3 pr-9", value ? "border-brand-500/60" : "border-line")}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </span>
    </label>
  );
}
