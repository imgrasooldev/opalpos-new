"use client";

/**
 * Purchases -> List purchases, as in the old Opal POS: filters (location,
 * supplier, purchase status, payment status, date range) above the table,
 * with a totals row for the grand total and the payment due.
 *
 * Row actions: View, Add payment, Update status and Delete. Changing a
 * purchase to or from Received, or deleting a Received one, moves stock.
 */

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { updateProducts } from "@/components/inventory/product-store";
import { PRODUCT_LOCATIONS } from "@/components/inventory/products-data";
import { PaymentDialog } from "@/components/purchases/payment-dialog";
import { returnTotals, usePurchaseReturns } from "@/components/purchases/purchase-returns-data";
import {
  PURCHASE_STATUSES,
  lineTotal,
  netUnitCost,
  paymentStatus,
  receiveStock,
  totals,
  updatePurchases,
  usePurchases,
  useSuppliers,
  type PaymentStatus,
  type Purchase,
  type PurchaseStatus,
} from "@/components/purchases/purchases-data";
import { ActionsMenu } from "@/components/ui/actions-menu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

const STATUS_TONE: Record<PurchaseStatus, string> = {
  Received: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  Pending: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Ordered: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
};
const PAYMENT_TONE: Record<PaymentStatus, string> = {
  Paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  Partial: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  Due: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Overdue: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11.5px] font-medium", tone)}>{children}</span>;
}

type Filters = { location: string; supplier: string; status: string; payment: string; from: string; to: string };
const NO_FILTERS: Filters = { location: "", supplier: "", status: "", payment: "", from: "", to: "" };

export function PurchasesScreen() {
  const purchases = usePurchases();
  const suppliers = useSuppliers();
  const returns = usePurchaseReturns();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [viewing, setViewing] = useState<Purchase | null>(null);
  const [paying, setPaying] = useState<Purchase | null>(null);
  const [changing, setChanging] = useState<Purchase | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);

  const returnsOf = (p: Purchase) => returns.filter((r) => r.parentRef === p.ref);
  /** Goods already sent back hold the purchase in place: no delete, no leaving Received. */
  const lockedByReturns = (p: Purchase) =>
    returnsOf(p).length > 0 &&
    (setBlocked(`${p.ref} has purchase returns (${returnsOf(p).map((r) => r.ref).join(", ")}). Delete those first.`), true);
  const supplierName = (p: Purchase) => suppliers.find((s) => s.id === p.supplierId)?.name ?? "Unknown supplier";
  const active = Object.entries(filters).filter(([k, v]) => v !== NO_FILTERS[k as keyof Filters]).length;

  const rows = useMemo(
    () =>
      purchases.filter(
        (p) =>
          (!filters.location || p.location === filters.location) &&
          (!filters.supplier || p.supplierId === Number(filters.supplier)) &&
          (!filters.status || p.status === filters.status) &&
          (!filters.payment || paymentStatus(p) === filters.payment) &&
          (!filters.from || p.date.slice(0, 10) >= filters.from) &&
          (!filters.to || p.date.slice(0, 10) <= filters.to),
      ),
    [purchases, filters],
  );

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  /** Stock follows the Received status: entering it adds, leaving it removes. */
  function changeStatus(p: Purchase, status: PurchaseStatus) {
    if (status === p.status) return;
    const next = { ...p, status };
    updatePurchases((prev) => prev.map((x) => (x.id === p.id ? next : x)));
    if (status === "Received") updateProducts((prev) => receiveStock(prev, next, supplierName(p), 1));
    else if (p.status === "Received") updateProducts((prev) => receiveStock(prev, p, supplierName(p), -1));
  }

  const columns: DataColumn<Purchase>[] = [
    {
      key: "date",
      label: "Date",
      sortValue: (p) => p.date,
      text: (p) => when(p.date),
      render: (p) => <span className="whitespace-nowrap">{when(p.date)}</span>,
    },
    {
      key: "ref",
      label: "Reference no",
      sortValue: (p) => p.ref,
      text: (p) => p.ref,
      render: (p) => (
        <button type="button" onClick={() => setViewing(p)} className="font-mono text-[12.5px] font-medium text-brand-500 hover:underline">
          {p.ref}
        </button>
      ),
    },
    { key: "location", label: "Location", sortValue: (p) => p.location, text: (p) => p.location },
    { key: "supplier", label: "Supplier", sortValue: supplierName, text: supplierName },
    {
      key: "status",
      label: "Purchase status",
      sortValue: (p) => p.status,
      text: (p) => p.status,
      render: (p) => <Pill tone={STATUS_TONE[p.status]}>{p.status}</Pill>,
    },
    {
      key: "payment",
      label: "Payment status",
      sortValue: (p) => paymentStatus(p),
      text: (p) => paymentStatus(p),
      render: (p) => <Pill tone={PAYMENT_TONE[paymentStatus(p)]}>{paymentStatus(p)}</Pill>,
    },
    {
      key: "total",
      label: "Grand total",
      sortValue: (p) => totals(p).total,
      text: (p) => totals(p).total.toFixed(2),
      render: (p) => <span className="tabular-nums">{USD.format(totals(p).total)}</span>,
      align: "right",
      total: (list) => (
        <span className="tabular-nums">{USD.format(list.reduce((t, p) => t + totals(p).total, 0))}</span>
      ),
    },
    {
      key: "due",
      label: "Payment due",
      sortValue: (p) => totals(p).due,
      text: (p) => totals(p).due.toFixed(2),
      render: (p) => (
        <span className={cn("tabular-nums", totals(p).due > 0 && "text-rose-600")}>{USD.format(totals(p).due)}</span>
      ),
      align: "right",
      total: (list) => (
        <span className="flex flex-col items-end text-[12px] font-normal">
          <span>
            Purchase due: <b className="tabular-nums">{USD.format(list.reduce((t, p) => t + totals(p).due, 0))}</b>
          </span>
          <span className="text-muted">
            Purchase return:{" "}
            <b className="tabular-nums">
              {USD.format(
                returns
                  .filter((r) => list.some((p) => p.ref === r.parentRef))
                  .reduce((t, r) => t + returnTotals(r).due, 0),
              )}
            </b>
          </span>
        </span>
      ),
    },
    { key: "addedBy", label: "Added by", sortValue: (p) => p.addedBy, text: (p) => p.addedBy },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Card
        title={
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Icon name="filter" className="h-4 w-4 text-brand-500" />
            Filters
            {active > 0 && (
              <span className="rounded-full bg-brand-500 px-1.5 text-[10.5px] font-medium text-white">{active}</span>
            )}
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <FilterSelect
            label="Business location"
            value={filters.location}
            onChange={(v) => set("location", v)}
            options={[{ value: "", label: "All" }, ...PRODUCT_LOCATIONS.map((l) => ({ value: l, label: l }))]}
          />
          <FilterSelect
            label="Supplier"
            value={filters.supplier}
            onChange={(v) => set("supplier", v)}
            options={[{ value: "", label: "All" }, ...suppliers.map((s) => ({ value: String(s.id), label: s.name }))]}
          />
          <FilterSelect
            label="Purchase status"
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[{ value: "", label: "All" }, ...PURCHASE_STATUSES.map((s) => ({ value: s, label: s }))]}
          />
          <FilterSelect
            label="Payment status"
            value={filters.payment}
            onChange={(v) => set("payment", v)}
            options={[{ value: "", label: "All" }, ...["Paid", "Due", "Partial", "Overdue"].map((s) => ({ value: s, label: s }))]}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Date range</span>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                aria-label="From date"
                value={filters.from}
                onChange={(event) => set("from", event.target.value)}
                className={cn(filterClass, "min-w-0 px-2", filters.from ? "border-brand-500/60" : "border-line")}
              />
              <span className="text-xs text-muted">to</span>
              <input
                type="date"
                aria-label="To date"
                value={filters.to}
                onChange={(event) => set("to", event.target.value)}
                className={cn(filterClass, "min-w-0 px-2", filters.to ? "border-brand-500/60" : "border-line")}
              />
            </div>
          </div>
        </div>
      </Card>

      <DataTable
        title="All purchases"
        subtitle={
          active > 0 ? `${rows.length} of ${purchases.length} purchases match the filters` : `${purchases.length} purchases`
        }
        rows={rows}
        columns={columns}
        rowKey={(p) => p.id}
        defaultSort={{ key: "date", direction: "desc" }}
        defaultPageSize={25}
        noun="purchases"
        exportName="purchases"
        minWidth={1100}
        actionsPosition="start"
        headerAction={
          <Link
            href="/purchases/create"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            <Icon name="plus" className="h-4 w-4" />
            Add
          </Link>
        }
        actions={(p) => (
          <ActionsMenu
            label={`Actions for ${p.ref}`}
            actions={[
              { label: "View", icon: "eye", onClick: () => setViewing(p) },
              { label: "Add payment", icon: "dollar", onClick: () => setPaying(p) },
              { label: "Update status", icon: "truck", onClick: () => !lockedByReturns(p) && setChanging(p) },
              ...(p.status === "Received"
                ? [{ label: "Purchase return", icon: "refund" as const, href: `/purchase-returns/create?purchase=${p.id}` }]
                : []),
              {
                label: "Delete",
                icon: "trash",
                danger: true,
                dividerBefore: true,
                onClick: () =>
                  !lockedByReturns(p) &&
                  setConfirm({
                    tone: "danger",
                    confirmLabel: "Delete",
                    message:
                      p.status === "Received"
                        ? `${p.ref} will be deleted and its ${totals(p).items} items taken back out of stock.`
                        : `${p.ref} will be deleted.`,
                    onConfirm: () => {
                      updatePurchases((prev) => prev.filter((x) => x.id !== p.id));
                      if (p.status === "Received") updateProducts((prev) => receiveStock(prev, p, supplierName(p), -1));
                    },
                  }),
              },
            ]}
          />
        )}
      />

      {viewing && (
        <ViewDialog
          purchase={purchases.find((p) => p.id === viewing.id) ?? viewing}
          supplier={suppliers.find((s) => s.id === viewing.supplierId)}
          onClose={() => setViewing(null)}
        />
      )}

      {paying && (
        <PaymentDialog
          key={paying.id}
          description={`${paying.ref} · ${supplierName(paying)}`}
          total={totals(paying).total}
          paid={totals(paying).paid}
          onClose={() => setPaying(null)}
          onSave={(payment) => {
            updatePurchases((prev) =>
              prev.map((x) => (x.id === paying.id ? { ...x, payments: [...x.payments, payment] } : x)),
            );
            setPaying(null);
          }}
        />
      )}

      {changing && (
        <StatusDialog
          key={changing.id}
          purchase={changing}
          onClose={() => setChanging(null)}
          onSave={(status) => {
            changeStatus(changing, status);
            setChanging(null);
          }}
        />
      )}

      {blocked && (
        <Modal
          title="Can't change this purchase"
          onClose={() => setBlocked(null)}
          className="max-w-sm"
          footer={
            <Button type="button" variant="secondary" onClick={() => setBlocked(null)}>
              OK
            </Button>
          }
        >
          <p className="text-[13px] text-muted">{blocked}</p>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          {...confirm}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            confirm.onConfirm();
            setConfirm(null);
          }}
        />
      )}
    </div>
  );
}

// ---------- dialogs ----------

function ViewDialog({
  purchase: p,
  supplier,
  onClose,
}: {
  purchase: Purchase;
  supplier?: { name: string; businessName: string; mobile: string; address: string };
  onClose: () => void;
}) {
  const t = totals(p);
  return (
    <Modal
      title={`Purchase details (Reference no: ${p.ref})`}
      onClose={onClose}
      className="max-w-4xl"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => window.print()}>
            <Icon name="printer" className="h-4 w-4" />
            Print
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="grid gap-4 text-[13px] sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted">Supplier</p>
          <p className="font-medium">{supplier?.name ?? "Unknown"}</p>
          {supplier && (
            <p className="text-muted">
              {supplier.businessName && <>{supplier.businessName}<br /></>}
              {supplier.address}
              <br />
              {supplier.mobile}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted">Location</p>
          <p className="font-medium">{p.location}</p>
          <p className="mt-2 text-xs text-muted">Date</p>
          <p>{when(p.date)}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p>
            <span className="text-muted">Purchase status:</span> <Pill tone={STATUS_TONE[p.status]}>{p.status}</Pill>
          </p>
          <p>
            <span className="text-muted">Payment status:</span>{" "}
            <Pill tone={PAYMENT_TONE[paymentStatus(p)]}>{paymentStatus(p)}</Pill>
          </p>
          {p.payTerm && <p className="text-muted">Pay term: {p.payTerm}</p>}
          <p className="text-muted">Added by: {p.addedBy}</p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface text-xs text-muted">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 text-right font-medium">Quantity</th>
              <th className="px-3 py-2 text-right font-medium">Unit cost</th>
              <th className="px-3 py-2 text-right font-medium">Discount</th>
              <th className="px-3 py-2 text-right font-medium">Net unit cost</th>
              <th className="px-3 py-2 text-right font-medium">Selling price</th>
              <th className="px-3 py-2 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {p.lines.map((l, i) => (
              <tr key={l.sku} className="border-b border-line last:border-0">
                <td className="px-3 py-2 text-muted">{i + 1}</td>
                <td className="px-3 py-2">
                  {l.name} <span className="font-mono text-xs text-muted">{l.sku}</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{l.qty.toFixed(2)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{USD.format(l.unitCost)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{l.discountPct}%</td>
                <td className="px-3 py-2 text-right tabular-nums">{USD.format(netUnitCost(l))}</td>
                <td className="px-3 py-2 text-right tabular-nums">{USD.format(l.sellingPrice)}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{USD.format(lineTotal(l))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <p className="mb-2 text-[13px] font-semibold">Payments</p>
          {p.payments.length === 0 ? (
            <p className="text-[13px] text-muted">No payments yet.</p>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line text-[13px]">
              {p.payments.map((x, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span>
                    {when(x.date)} · {x.method}
                    {x.note && <span className="text-muted"> · {x.note}</span>}
                  </span>
                  <span className="font-medium tabular-nums">{USD.format(x.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          {(p.notes || p.shippingDetails) && (
            <div className="mt-3 text-[13px]">
              {p.shippingDetails && <p><span className="text-muted">Shipping details:</span> {p.shippingDetails}</p>}
              {p.notes && <p><span className="text-muted">Notes:</span> {p.notes}</p>}
            </div>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-y-1 self-start text-[13px]">
          <dt className="text-muted">Net total amount:</dt>
          <dd className="text-right tabular-nums">{USD.format(t.net)}</dd>
          <dt className="text-muted">Discount:</dt>
          <dd className="text-right tabular-nums">(−) {USD.format(t.discount)}</dd>
          <dt className="text-muted">Purchase tax{p.tax ? ` (${p.tax})` : ""}:</dt>
          <dd className="text-right tabular-nums">(+) {USD.format(t.tax)}</dd>
          <dt className="text-muted">Shipping charges:</dt>
          <dd className="text-right tabular-nums">(+) {USD.format(p.shipping)}</dd>
          {p.expenses.map((e, i) => (
            <div key={i} className="contents">
              <dt className="text-muted">{e.name || "Additional expense"}:</dt>
              <dd className="text-right tabular-nums">(+) {USD.format(e.amount)}</dd>
            </div>
          ))}
          <dt className="border-t border-line pt-1 font-semibold">Purchase total:</dt>
          <dd className="border-t border-line pt-1 text-right font-semibold tabular-nums">{USD.format(t.total)}</dd>
          <dt className="text-muted">Paid:</dt>
          <dd className="text-right tabular-nums">{USD.format(t.paid)}</dd>
          <dt className="font-medium">Payment due:</dt>
          <dd className={cn("text-right font-medium tabular-nums", t.due > 0 ? "text-rose-600" : "text-emerald-600")}>
            {USD.format(t.due)}
          </dd>
        </dl>
      </div>
    </Modal>
  );
}

function StatusDialog({
  purchase,
  onClose,
  onSave,
}: {
  purchase: Purchase;
  onClose: () => void;
  onSave: (status: PurchaseStatus) => void;
}) {
  const [status, setStatus] = useState<PurchaseStatus>(purchase.status);
  const items = totals(purchase).items;
  const effect =
    status === purchase.status
      ? null
      : status === "Received"
        ? `${items} items will be added to stock at ${purchase.location}.`
        : purchase.status === "Received"
          ? `${items} items will be taken back out of stock at ${purchase.location}.`
          : null;

  return (
    <Modal
      title="Update status"
      description={purchase.ref}
      onClose={onClose}
      className="max-w-sm"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="brand" onClick={() => onSave(status)}>
            Update
          </Button>
        </>
      }
    >
      <FilterSelect
        label="Purchase status *"
        value={status}
        onChange={(v) => setStatus(v as PurchaseStatus)}
        options={PURCHASE_STATUSES.map((s) => ({ value: s, label: s }))}
      />
      {effect && <p className="mt-3 text-[13px] text-muted">{effect}</p>}
    </Modal>
  );
}

// ---------- pieces ----------

const filterClass =
  "w-full rounded-lg border bg-background py-2 text-[13px] outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25";

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
          className={cn(filterClass, "appearance-none px-3 pr-9", value ? "border-brand-500/60" : "border-line")}
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
