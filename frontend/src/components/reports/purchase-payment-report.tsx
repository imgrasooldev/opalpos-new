"use client";

/**
 * Reports -> Purchase payment report, as in the old Opal POS: filters
 * (supplier, business location, date range) above a table of every payment
 * made on purchases: reference no, paid on, amount, supplier, payment
 * method, the purchase it paid, and View, which opens the "View payment"
 * popup with Print.
 *
 * Payments saved without a reference get a stable PP number from their order.
 */

import Link from "next/link";
import { useMemo, useState } from "react";

import { DEMO_BUSINESS } from "@/components/contacts/customers-data";
import { useHydrated } from "@/components/inventory/product-store";
import { PRODUCT_LOCATIONS } from "@/components/inventory/products-data";
import { usePurchases, useSuppliers, type Purchase, type PurchasePayment, type Supplier } from "@/components/purchases/purchases-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon, type IconName } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

type Filters = { supplier: string; location: string; from: string; to: string };
// the old screen opens on the current year
const YEAR = new Date().getFullYear();
const DEFAULT_FILTERS: Filters = { supplier: "", location: "", from: `${YEAR}-01-01`, to: `${YEAR}-12-31` };

type PaymentRow = PurchasePayment & { key: string; refNo: string; purchase: Purchase; supplier: Supplier | undefined };

const METHOD_ICON: Record<string, IconName> = { Cash: "dollar", Card: "receipt", Cheque: "pencil", "Bank transfer": "transfer", Other: "dollar" };

export function PurchasePaymentReport() {
  const hydrated = useHydrated();
  const purchases = usePurchases();
  const suppliers = useSuppliers();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [viewing, setViewing] = useState<PaymentRow | null>(null);

  const all = useMemo(() => {
    const byId = new Map(suppliers.map((s) => [s.id, s]));
    const list = purchases
      .flatMap((p) =>
        p.payments.map((pay, i) => ({
          ...pay,
          key: `${p.id}-${i}`,
          refNo: (pay as PurchasePayment & { ref?: string }).ref ?? "",
          purchase: p,
          supplier: byId.get(p.supplierId),
        })),
      )
      .sort((a, b) => a.date.localeCompare(b.date));
    // payments saved without a reference get the next PP number in date order
    let n = Math.max(0, ...list.map((p) => Number(p.refNo.split("/")[1]) || 0));
    return list.map((p) => (p.refNo ? p : { ...p, refNo: `PP${p.date.slice(0, 4)}/${String(++n).padStart(4, "0")}` }));
  }, [purchases, suppliers]);

  const rows = useMemo(
    () =>
      all.filter(
        (p) =>
          (!filters.supplier || p.purchase.supplierId === Number(filters.supplier)) &&
          (!filters.location || p.purchase.location === filters.location) &&
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
      key: "supplier",
      label: "Supplier",
      sortValue: (p) => p.supplier?.name ?? "",
      text: (p) => p.supplier?.name ?? "",
      render: (p) =>
        p.supplier ? (
          <span className="leading-tight">
            <span className="block">{p.supplier.name}</span>
            <span className="block text-xs text-muted">{p.supplier.businessName}</span>
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: "method",
      label: "Payment method",
      sortValue: (p) => p.method,
      text: (p) => p.method,
      render: (p) => (
        <span className="inline-flex items-center gap-1.5">
          <Icon name={METHOD_ICON[p.method] ?? "dollar"} className="h-3.5 w-3.5 text-muted" />
          {p.method}
        </span>
      ),
    },
    {
      key: "purchase",
      label: "Purchase",
      sortValue: (p) => p.purchase.ref,
      text: (p) => p.purchase.ref,
      render: (p) => (
        <Link href={`/purchases?view=${p.purchase.id}`} className="font-mono text-[12.5px] text-brand-500 hover:underline">
          {p.purchase.ref}
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
        <div className="grid gap-4 md:grid-cols-3">
          <FilterSelect
            label="Supplier"
            icon="contact"
            value={filters.supplier}
            onChange={(v) => set("supplier", v)}
            options={[{ value: "", label: "All suppliers" }, ...suppliers.map((s) => ({ value: String(s.id), label: s.name }))]}
          />
          <FilterSelect
            label="Business location"
            icon="store"
            value={filters.location}
            onChange={(v) => set("location", v)}
            options={[{ value: "", label: "All locations" }, ...PRODUCT_LOCATIONS.map((l) => ({ value: l, label: l }))]}
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
          title="Purchase payments"
          subtitle={active > 0 ? `${rows.length} of ${all.length} payments match the filters` : `${rows.length} payments`}
          rows={rows}
          columns={columns}
          rowKey={(p) => p.key}
          defaultSort={{ key: "date", direction: "desc" }}
          defaultPageSize={100}
          noun="payments"
          exportName="purchase-payment-report"
          minWidth={900}
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

/** "View payment" popup: supplier and business, then the payment. */
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
          <p className="text-xs text-muted">Supplier</p>
          <p className="font-medium">{p.supplier?.name ?? "Unknown supplier"}</p>
          {p.supplier?.businessName && <p className="text-muted">{p.supplier.businessName}</p>}
          {p.supplier?.mobile && <p className="text-muted">Mobile: {p.supplier.mobile}</p>}
          {p.supplier?.address && <p className="text-muted">{p.supplier.address}</p>}
        </div>
        <div className="rounded-lg border border-line px-3.5 py-3">
          <p className="text-xs text-muted">Business</p>
          <p className="font-medium">
            {DEMO_BUSINESS.name} <span className="font-normal text-muted">{p.purchase.location}</span>
          </p>
          {DEMO_BUSINESS.lines.map((l) => (
            <p key={l} className="text-muted">
              {l}
            </p>
          ))}
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
          <dd className="inline">{p.method}</dd>
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
          <dt className="inline font-medium">Purchase: </dt>
          <dd className="inline">
            <Link href={`/purchases?view=${p.purchase.id}`} className="font-mono text-brand-500 hover:underline">
              {p.purchase.ref}
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
