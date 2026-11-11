"use client";

/**
 * Purchases -> List purchase return, as in the old Opal POS: location and
 * date range filters, then Date, Reference no, Parent purchase, Location,
 * Supplier, Payment status, Grand total, Payment due and Action, with totals.
 *
 * Actions: View, Add payment (the supplier paying us back) and Delete, which
 * puts the returned goods back into stock.
 */

import Link from "next/link";
import { useMemo, useState } from "react";

import { updateProducts } from "@/components/inventory/product-store";
import { PRODUCT_LOCATIONS } from "@/components/inventory/products-data";
import { PaymentDialog } from "@/components/purchases/payment-dialog";
import {
  applyReturn,
  returnPaymentStatus,
  returnTotals,
  updatePurchaseReturns,
  usePurchaseReturns,
  type PurchaseReturn,
} from "@/components/purchases/purchase-returns-data";
import { useSuppliers } from "@/components/purchases/purchases-data";
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

const PAYMENT_TONE = {
  Paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  Partial: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  Due: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

const fieldClass =
  "w-full rounded-lg border bg-background py-2 text-[13px] outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25";

export function PurchaseReturnsScreen() {
  const returns = usePurchaseReturns();
  const suppliers = useSuppliers();
  const [location, setLocation] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [viewing, setViewing] = useState<PurchaseReturn | null>(null);
  const [paying, setPaying] = useState<PurchaseReturn | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);

  const supplierName = (r: PurchaseReturn) => suppliers.find((s) => s.id === r.supplierId)?.name ?? "Unknown supplier";
  const active = [location, from, to].filter(Boolean).length;

  const rows = useMemo(
    () =>
      returns.filter(
        (r) =>
          (!location || r.location === location) &&
          (!from || r.date.slice(0, 10) >= from) &&
          (!to || r.date.slice(0, 10) <= to),
      ),
    [returns, location, from, to],
  );

  const columns: DataColumn<PurchaseReturn>[] = [
    {
      key: "date",
      label: "Date",
      sortValue: (r) => r.date,
      text: (r) => when(r.date),
      render: (r) => <span className="whitespace-nowrap">{when(r.date)}</span>,
    },
    {
      key: "ref",
      label: "Reference no",
      sortValue: (r) => r.ref,
      text: (r) => r.ref,
      render: (r) => (
        <button type="button" onClick={() => setViewing(r)} className="font-mono text-[12.5px] font-medium text-brand-500 hover:underline">
          {r.ref}
        </button>
      ),
    },
    {
      key: "parent",
      label: "Parent purchase",
      sortValue: (r) => r.parentRef ?? "",
      text: (r) => r.parentRef ?? "",
      render: (r) => (r.parentRef ? <span className="font-mono text-[12.5px]">{r.parentRef}</span> : <span className="text-muted">-</span>),
    },
    { key: "location", label: "Location", sortValue: (r) => r.location, text: (r) => r.location },
    { key: "supplier", label: "Supplier", sortValue: supplierName, text: supplierName },
    {
      key: "payment",
      label: "Payment status",
      sortValue: returnPaymentStatus,
      text: returnPaymentStatus,
      render: (r) => (
        <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11.5px] font-medium", PAYMENT_TONE[returnPaymentStatus(r)])}>
          {returnPaymentStatus(r)}
        </span>
      ),
    },
    {
      key: "total",
      label: "Grand total",
      sortValue: (r) => returnTotals(r).total,
      text: (r) => returnTotals(r).total.toFixed(2),
      render: (r) => <span className="tabular-nums">{USD.format(returnTotals(r).total)}</span>,
      align: "right",
      total: (list) => <span className="tabular-nums">{USD.format(list.reduce((t, r) => t + returnTotals(r).total, 0))}</span>,
    },
    {
      key: "due",
      label: "Payment due",
      sortValue: (r) => returnTotals(r).due,
      text: (r) => returnTotals(r).due.toFixed(2),
      render: (r) => (
        <span className={cn("tabular-nums", returnTotals(r).due > 0 && "text-rose-600")}>{USD.format(returnTotals(r).due)}</span>
      ),
      align: "right",
      total: (list) => <span className="tabular-nums">{USD.format(list.reduce((t, r) => t + returnTotals(r).due, 0))}</span>,
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
              onClick={() => {
                setLocation("");
                setFrom("");
                setTo("");
              }}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              Reset filters
            </button>
          )
        }
        bodyClassName="border-t border-line pt-4"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Business location</span>
            <span className="relative">
              <select
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className={cn(fieldClass, "appearance-none px-3 pr-9", location ? "border-brand-500/60" : "border-line")}
              >
                <option value="">All</option>
                {PRODUCT_LOCATIONS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
              <Icon name="chevron-down" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            </span>
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Date range</span>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                aria-label="From date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className={cn(fieldClass, "min-w-0 px-2", from ? "border-brand-500/60" : "border-line")}
              />
              <span className="text-xs text-muted">to</span>
              <input
                type="date"
                aria-label="To date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className={cn(fieldClass, "min-w-0 px-2", to ? "border-brand-500/60" : "border-line")}
              />
            </div>
          </div>
        </div>
      </Card>

      <DataTable
        title="All purchase returns"
        subtitle={active > 0 ? `${rows.length} of ${returns.length} returns match the filters` : `${returns.length} returns`}
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        defaultSort={{ key: "date", direction: "desc" }}
        defaultPageSize={100}
        noun="returns"
        exportName="purchase-returns"
        minWidth={1050}
        headerAction={
          <Link
            href="/purchase-returns/create"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            <Icon name="plus" className="h-4 w-4" />
            Add
          </Link>
        }
        actions={(r) => (
          <ActionsMenu
            label={`Actions for ${r.ref}`}
            actions={[
              { label: "View", icon: "eye", onClick: () => setViewing(r) },
              { label: "Add payment", icon: "dollar", onClick: () => setPaying(r) },
              {
                label: "Delete",
                icon: "trash",
                danger: true,
                dividerBefore: true,
                onClick: () =>
                  setConfirm({
                    tone: "danger",
                    confirmLabel: "Delete",
                    message: `${r.ref} will be deleted and its ${returnTotals(r).items} items put back into stock.`,
                    onConfirm: () => {
                      updatePurchaseReturns((prev) => prev.filter((x) => x.id !== r.id));
                      updateProducts((prev) => applyReturn(prev, r, supplierName(r), -1));
                    },
                  }),
              },
            ]}
          />
        )}
      />

      {viewing && (
        <ViewDialog
          ret={returns.find((r) => r.id === viewing.id) ?? viewing}
          supplier={supplierName(viewing)}
          onClose={() => setViewing(null)}
        />
      )}

      {paying && (
        <PaymentDialog
          key={paying.id}
          description={`${paying.ref} · ${supplierName(paying)} pays you back`}
          total={returnTotals(paying).total}
          paid={returnTotals(paying).paid}
          onClose={() => setPaying(null)}
          onSave={(payment) => {
            updatePurchaseReturns((prev) => prev.map((x) => (x.id === paying.id ? { ...x, payments: [...x.payments, payment] } : x)));
            setPaying(null);
          }}
        />
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

function ViewDialog({ ret: r, supplier, onClose }: { ret: PurchaseReturn; supplier: string; onClose: () => void }) {
  const t = returnTotals(r);
  return (
    <Modal
      title={`Purchase return details (Reference no: ${r.ref})`}
      onClose={onClose}
      className="max-w-3xl"
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
          <p className="font-medium">{supplier}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Location</p>
          <p className="font-medium">{r.location}</p>
          <p className="mt-2 text-xs text-muted">Date</p>
          <p>{when(r.date)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Parent purchase</p>
          <p className="font-mono">{r.parentRef ?? "-"}</p>
          <p className="mt-2 text-xs text-muted">Added by</p>
          <p>{r.addedBy}</p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface text-xs text-muted">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 text-right font-medium">Quantity</th>
              <th className="px-3 py-2 text-right font-medium">Unit price</th>
              <th className="px-3 py-2 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {r.lines.map((l, i) => (
              <tr key={l.sku} className="border-b border-line last:border-0">
                <td className="px-3 py-2 text-muted">{i + 1}</td>
                <td className="px-3 py-2">
                  {l.name} <span className="font-mono text-xs text-muted">{l.sku}</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{l.qty.toFixed(2)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{USD.format(l.unitPrice)}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{USD.format(l.qty * l.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto mt-5 grid w-72 grid-cols-2 gap-y-1 text-[13px]">
        <dt className="text-muted">Net total amount:</dt>
        <dd className="text-right tabular-nums">{USD.format(t.net)}</dd>
        <dt className="text-muted">Purchase tax{r.tax ? ` (${r.tax})` : ""}:</dt>
        <dd className="text-right tabular-nums">(+) {USD.format(t.tax)}</dd>
        <dt className="border-t border-line pt-1 font-semibold">Return total:</dt>
        <dd className="border-t border-line pt-1 text-right font-semibold tabular-nums">{USD.format(t.total)}</dd>
        <dt className="text-muted">Paid back:</dt>
        <dd className="text-right tabular-nums">{USD.format(t.paid)}</dd>
        <dt className="font-medium">Payment due:</dt>
        <dd className={cn("text-right font-medium tabular-nums", t.due > 0 ? "text-rose-600" : "text-emerald-600")}>{USD.format(t.due)}</dd>
      </dl>
    </Modal>
  );
}
