"use client";

/**
 * Reports -> Sell payment report, as in the old Opal POS: filters (customer,
 * business location, payment method, customer group, date range) above a
 * table of every payment taken on final sales: reference no, paid on,
 * amount, customer, customer group, payment method, the sale it paid, and
 * View, which opens the "View payment" popup with Print.
 *
 * Older demo payments have no reference, so they get a stable SP number
 * from their order. Change handed back on a cash sale shows as
 * "(Change return)" under the method.
 */

import Link from "next/link";
import { useMemo, useState } from "react";

import { useCustomers } from "@/components/contacts/customer-store";
import { CUSTOMER_GROUPS, DEMO_BUSINESS, type DemoCustomer } from "@/components/contacts/customers-data";
import { useHydrated } from "@/components/inventory/product-store";
import { PRODUCT_LOCATIONS, TAXES } from "@/components/inventory/products-data";
import { SALE_PAYMENT_METHODS, saleTotals, useSales, type Sale, type SalePayment } from "@/components/sales/sales-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon, type IconName } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

type Filters = { customer: string; location: string; method: string; group: string; from: string; to: string };
// the old screen opens on the current year
const YEAR = new Date().getFullYear();
const DEFAULT_FILTERS: Filters = { customer: "", location: "", method: "", group: "", from: `${YEAR}-01-01`, to: `${YEAR}-12-31` };

type PaymentRow = SalePayment & {
  key: string;
  refNo: string;
  sale: Sale;
  customer: DemoCustomer | undefined;
  /** Cash handed back on this payment, when the customer paid over the total. */
  change: number;
};

export function SellPaymentReport() {
  const hydrated = useHydrated();
  const sales = useSales();
  const customers = useCustomers();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [viewing, setViewing] = useState<PaymentRow | null>(null);

  const all = useMemo(() => {
    const byId = new Map(customers.map((c) => [c.id, c]));
    const list = sales
      .filter((s) => s.status === "Final")
      .flatMap((s) => {
        const t = saleTotals(s);
        const over = Math.max(0, Math.round((t.paid - t.total) * 100) / 100);
        const lastCash = s.payments.map((p) => p.method).lastIndexOf("Cash");
        return s.payments.map((p, i) => ({
          ...p,
          key: `${s.id}-${i}`,
          refNo: p.ref ?? "",
          sale: s,
          customer: byId.get(s.customerId),
          change: i === lastCash ? over : 0,
        }));
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    // payments saved without a reference get the next SP number in date order
    let n = Math.max(0, ...list.map((p) => Number(p.refNo.split("/")[1]) || 0));
    return list.map((p) => (p.refNo ? p : { ...p, refNo: `SP${p.date.slice(0, 4)}/${String(++n).padStart(4, "0")}` }));
  }, [sales, customers]);

  const rows = useMemo(
    () =>
      all.filter(
        (p) =>
          (!filters.customer || p.sale.customerId === Number(filters.customer)) &&
          (!filters.location || p.sale.location === filters.location) &&
          (!filters.method || p.method === filters.method) &&
          (!filters.group || p.customer?.group === filters.group) &&
          (!filters.from || p.date.slice(0, 10) >= filters.from) &&
          (!filters.to || p.date.slice(0, 10) <= filters.to),
      ),
    [all, filters],
  );

  const active = Object.entries(filters).filter(([k, v]) => v !== DEFAULT_FILTERS[k as keyof Filters]).length;
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((prev) => ({ ...prev, [key]: value }));

  const columns: DataColumn<PaymentRow>[] = [
    {
      key: "ref",
      label: "Reference no",
      sortValue: (p) => p.refNo,
      text: (p) => p.refNo,
      render: (p) => (
        <button type="button" onClick={() => setViewing(p)} className="font-mono text-[12.5px] font-medium text-brand-500 hover:underline">
          {p.refNo}
        </button>
      ),
    },
    { key: "date", label: "Paid on", sortValue: (p) => p.date, text: (p) => when(p.date), render: (p) => <span className="whitespace-nowrap">{when(p.date)}</span> },
    {
      key: "amount",
      label: "Amount",
      sortValue: (p) => p.amount,
      text: (p) => p.amount.toFixed(2),
      render: (p) => <span className="font-medium tabular-nums">{USD.format(p.amount)}</span>,
      align: "right",
      total: (list) => <span className="tabular-nums">{USD.format(list.reduce((t, p) => t + p.amount, 0))}</span>,
    },
    {
      key: "customer",
      label: "Customer",
      sortValue: (p) => p.customer?.name ?? "",
      text: (p) => p.customer?.name ?? "",
      render: (p) =>
        p.customer ? (
          <Link href={`/contacts/customers/${p.customer.id}`} className="hover:text-brand-500 hover:underline">
            {p.customer.name}
          </Link>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: "group",
      label: "Customer group",
      sortValue: (p) => p.customer?.group ?? "",
      text: (p) => p.customer?.group ?? "",
      render: (p) => p.customer?.group ?? <span className="text-muted">—</span>,
    },
    {
      key: "method",
      label: "Payment method",
      sortValue: (p) => p.method,
      text: (p) => p.method + (p.change ? " (Change return)" : ""),
      render: (p) => (
        <span className="leading-tight">
          <span className="inline-flex items-center gap-1.5">
            <Icon name={METHOD_ICON[p.method] ?? "dollar"} className="h-3.5 w-3.5 text-muted" />
            {p.method}
          </span>
          {p.change > 0 && <span className="block text-[11px] text-muted">(Change return {USD.format(p.change)})</span>}
        </span>
      ),
    },
    {
      key: "sell",
      label: "Sell",
      sortValue: (p) => p.sale.invoiceNo,
      text: (p) => p.sale.invoiceNo,
      render: (p) => (
        <Link href={`/sales?view=${p.sale.id}`} className="font-mono text-[12.5px] text-brand-500 hover:underline">
          {p.sale.invoiceNo}
        </Link>
      ),
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
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              Reset filters
            </button>
          )
        }
        className="print:hidden"
        bodyClassName="border-t border-line pt-4"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FilterSelect
            label="Customer"
            icon="contact"
            value={filters.customer}
            onChange={(v) => set("customer", v)}
            options={[{ value: "", label: "All" }, ...customers.map((c) => ({ value: String(c.id), label: c.name }))]}
          />
          <FilterSelect
            label="Business location"
            icon="store"
            value={filters.location}
            onChange={(v) => set("location", v)}
            options={[{ value: "", label: "All" }, ...PRODUCT_LOCATIONS.map((l) => ({ value: l, label: l }))]}
          />
          <FilterSelect
            label="Payment method"
            icon="dollar"
            value={filters.method}
            onChange={(v) => set("method", v)}
            options={[{ value: "", label: "All" }, ...SALE_PAYMENT_METHODS.map((m) => ({ value: m, label: m }))]}
          />
          <FilterSelect
            label="Customer group"
            icon="users"
            value={filters.group}
            onChange={(v) => set("group", v)}
            options={[{ value: "", label: "All" }, ...CUSTOMER_GROUPS.map((g) => ({ value: g, label: g }))]}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Date range</span>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                aria-label="From date"
                value={filters.from}
                onChange={(event) => set("from", event.target.value)}
                className={cn(filterClass, "min-w-0 px-2", filters.from !== DEFAULT_FILTERS.from ? "border-brand-500/60" : "border-line")}
              />
              <span className="text-xs text-muted">to</span>
              <input
                type="date"
                aria-label="To date"
                value={filters.to}
                onChange={(event) => set("to", event.target.value)}
                className={cn(filterClass, "min-w-0 px-2", filters.to !== DEFAULT_FILTERS.to ? "border-brand-500/60" : "border-line")}
              />
            </div>
          </div>
        </div>
      </Card>

      {!hydrated ? (
        <p className="py-10 text-center text-[13px] text-muted">Loading…</p>
      ) : (
        <DataTable
          title="Sell payments"
          subtitle={active > 0 ? `${rows.length} of ${all.length} payments match the filters` : `${rows.length} payments`}
          rows={rows}
          columns={columns}
          rowKey={(p) => p.key}
          defaultSort={{ key: "date", direction: "desc" }}
          defaultPageSize={100}
          noun="payments"
          exportName="sell-payment-report"
          minWidth={1000}
          actions={(p) => (
            <button
              type="button"
              onClick={() => setViewing(p)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-500/30 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-100 dark:bg-brand-900 dark:text-brand-200"
            >
              <Icon name="eye" className="h-3.5 w-3.5" />
              View
            </button>
          )}
        />
      )}

      {viewing && <ViewPaymentDialog payment={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

const METHOD_ICON: Record<string, IconName> = { Cash: "dollar", Card: "receipt", Cheque: "pencil", "Bank transfer": "transfer", Other: "dollar" };

/** "View payment" popup, laid out like the old one: customer and business, then the payment. */
function ViewPaymentDialog({ payment: p, onClose }: { payment: PaymentRow; onClose: () => void }) {
  return (
    <Modal
      title={`View payment (Reference no: ${p.refNo})`}
      onClose={onClose}
      className="max-w-xl"
      footer={
        <>
          <Button type="button" variant="brand" onClick={() => window.print()}>
            <Icon name="printer" className="h-4 w-4" />
            Print
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="grid gap-4 text-[13px] sm:grid-cols-2">
        <div className="rounded-lg border border-line px-3.5 py-3">
          <p className="text-xs text-muted">Customer</p>
          <p className="font-medium">{p.customer?.name ?? "Unknown customer"}</p>
          {p.customer?.mobile && <p className="text-muted">Mobile: {p.customer.mobile}</p>}
        </div>
        <div className="rounded-lg border border-line px-3.5 py-3">
          <p className="text-xs text-muted">Business</p>
          <p className="font-medium">
            {DEMO_BUSINESS.name} <span className="font-normal text-muted">{p.sale.location}</span>
          </p>
          {DEMO_BUSINESS.lines.map((l) => (
            <p key={l} className="text-muted">
              {l}
            </p>
          ))}
          <p className="text-muted">{TAXES[0]}</p>
        </div>
      </div>
      <dl className="mt-4 grid gap-x-6 gap-y-2 rounded-lg bg-surface px-4 py-3 text-[13px] sm:grid-cols-2">
        <div>
          <dt className="inline font-medium">Amount: </dt>
          <dd className="inline tabular-nums">{USD.format(p.amount)}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Reference no: </dt>
          <dd className="inline font-mono">{p.refNo}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Payment method: </dt>
          <dd className="inline">
            {p.method}
            {p.change > 0 && <span className="text-muted"> (change return {USD.format(p.change)})</span>}
          </dd>
        </div>
        <div>
          <dt className="inline font-medium">Paid on: </dt>
          <dd className="inline">{when(p.date)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="inline font-medium">Payment note: </dt>
          <dd className="inline text-muted">{p.note || "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="inline font-medium">Sell: </dt>
          <dd className="inline">
            <Link href={`/sales?view=${p.sale.id}`} className="font-mono text-brand-500 hover:underline">
              {p.sale.invoiceNo}
            </Link>
          </dd>
        </div>
      </dl>
    </Modal>
  );
}

const filterClass =
  "w-full rounded-lg border bg-background py-2 text-[13px] outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25";

function FilterSelect({
  label,
  icon,
  value,
  onChange,
  options,
}: {
  label: string;
  icon: IconName;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className="relative">
        <Icon name={icon} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <select
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(filterClass, "appearance-none pl-9 pr-9", value ? "border-brand-500/60" : "border-line")}
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
