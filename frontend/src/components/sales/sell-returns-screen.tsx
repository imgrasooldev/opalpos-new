"use client";

/**
 * Sell -> List sell return, as in the old Opal POS: location, customer, date
 * range and user filters, then Date, Invoice no, Parent sale, Customer name,
 * Location, Payment status, Total amount (inc. tax), Payment due and Action,
 * with totals.
 *
 * Returns are made from All sales ("Sell return"). Here: View, Edit (its own
 * page), Delete (takes the goods back out of stock), Print, Add payment
 * (refund the customer) and View payments.
 */

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { useCustomers } from "@/components/contacts/customer-store";
import { updateProducts } from "@/components/inventory/product-store";
import { PRODUCT_LOCATIONS } from "@/components/inventory/products-data";
import { PaymentDialog } from "@/components/purchases/payment-dialog";
import {
  applySellReturn,
  nextPaymentRef,
  returnActivities,
  sellReturnTotals,
  updateSellReturns,
  useSales,
  useSellReturns,
  type Sale,
  type SellReturn,
} from "@/components/sales/sales-data";
import { ReturnPaymentsDialog } from "@/components/sales/return-payments-dialog";
import { ActionsMenu } from "@/components/ui/actions-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { DEMO_USERS } from "@/components/users/users-data";
import { cn } from "@/lib/cn";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const STATUS_TONE = { Paid: "green", Partial: "amber", Due: "rose" } as const;
const fieldClass =
  "w-full rounded-lg border bg-background py-2 text-[13px] outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25";

const status = (r: SellReturn): "Paid" | "Partial" | "Due" => {
  const t = sellReturnTotals(r);
  return t.due <= 0 ? "Paid" : t.refunded > 0 ? "Partial" : "Due";
};

type Filters = { location: string; customer: string; from: string; to: string; user: string };
const NO_FILTERS: Filters = { location: "", customer: "", from: "", to: "", user: "" };

export function SellReturnsScreen() {
  const returns = useSellReturns();
  const sales = useSales();
  const customers = useCustomers();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [viewing, setViewing] = useState<{ id: number; print?: boolean } | null>(null);
  const [paying, setPaying] = useState<SellReturn | null>(null);
  const [payments, setPayments] = useState<SellReturn | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);

  const saleOf = (r: SellReturn) => sales.find((s) => s.id === r.saleId);
  const customerName = (r: SellReturn) => {
    const sale = saleOf(r);
    return customers.find((c) => c.id === sale?.customerId)?.name ?? "Unknown customer";
  };
  const customerOf = (r: SellReturn) => customers.find((c) => c.id === saleOf(r)?.customerId);
  const locationOf = (r: SellReturn) => saleOf(r)?.location ?? "-";
  const active = Object.entries(filters).filter(([k, v]) => v !== NO_FILTERS[k as keyof Filters]).length;

  const rows = useMemo(
    () =>
      returns.filter((r) => {
        const sale = sales.find((s) => s.id === r.saleId);
        return (
          (!filters.location || sale?.location === filters.location) &&
          (!filters.customer || sale?.customerId === Number(filters.customer)) &&
          (!filters.from || r.date.slice(0, 10) >= filters.from) &&
          (!filters.to || r.date.slice(0, 10) <= filters.to) &&
          (!filters.user || r.addedBy === filters.user)
        );
      }),
    [returns, sales, filters],
  );

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const columns: DataColumn<SellReturn>[] = [
    {
      key: "date",
      label: "Date",
      sortValue: (r) => r.date,
      text: (r) => `${day(r.date)} ${time(r.date)}`,
      render: (r) => (
        <span className="leading-tight">
          <span className="block">{day(r.date)}</span>
          <span className="block text-xs text-muted">{time(r.date)}</span>
        </span>
      ),
    },
    {
      key: "ref",
      label: "Invoice no.",
      sortValue: (r) => r.ref,
      text: (r) => r.ref,
      render: (r) => (
        <button type="button" onClick={() => setViewing({ id: r.id })} className="font-mono text-[12.5px] font-medium text-brand-500 hover:underline">
          {r.ref}
        </button>
      ),
    },
    {
      key: "parent",
      label: "Parent sale",
      sortValue: (r) => saleOf(r)?.invoiceNo ?? "",
      text: (r) => saleOf(r)?.invoiceNo ?? "",
      render: (r) =>
        saleOf(r) ? (
          <Link href={`/sales?view=${r.saleId}`} className="font-mono text-[12.5px] text-brand-500 hover:underline">
            {saleOf(r)!.invoiceNo}
          </Link>
        ) : (
          <span className="text-muted">Deleted</span>
        ),
    },
    {
      key: "customer",
      label: "Customer name",
      sortValue: customerName,
      text: customerName,
      render: (r) => <span className="font-medium">{customerName(r)}</span>,
    },
    { key: "location", label: "Location", sortValue: locationOf, text: locationOf },
    {
      key: "status",
      label: "Payment status",
      sortValue: status,
      text: status,
      render: (r) => <Badge tone={STATUS_TONE[status(r)]}>{status(r)}</Badge>,
      total: (list) =>
        Object.entries(
          list.reduce<Record<string, number>>((acc, r) => ({ ...acc, [status(r)]: (acc[status(r)] ?? 0) + 1 }), {}),
        ).map(([label, n]) => (
          <span key={label} className="block whitespace-nowrap font-normal">
            {label} - {n}
          </span>
        )),
    },
    {
      key: "total",
      label: "Total amount (inc. tax)",
      sortValue: (r) => sellReturnTotals(r).total,
      text: (r) => sellReturnTotals(r).total.toFixed(2),
      render: (r) => <span className="font-medium tabular-nums">{USD.format(sellReturnTotals(r).total)}</span>,
      align: "right",
      total: (list) => USD.format(list.reduce((t, r) => t + sellReturnTotals(r).total, 0)),
    },
    {
      key: "due",
      label: "Payment due",
      sortValue: (r) => sellReturnTotals(r).due,
      text: (r) => sellReturnTotals(r).due.toFixed(2),
      render: (r) => (
        <span className={cn("tabular-nums", sellReturnTotals(r).due > 0 ? "font-medium text-rose-600" : "text-muted")}>
          {USD.format(sellReturnTotals(r).due)}
        </span>
      ),
      align: "right",
      total: (list) => USD.format(list.reduce((t, r) => t + sellReturnTotals(r).due, 0)),
    },
  ];

  const viewed = viewing && returns.find((r) => r.id === viewing.id);

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
        </div>
      </Card>

      <DataTable
        title="Sell return"
        subtitle={
          active > 0
            ? `${rows.length} of ${returns.length} returns match the filters`
            : `${returns.length} returns · made from All sales -> Actions -> Sell return`
        }
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        defaultSort={{ key: "date", direction: "desc" }}
        defaultPageSize={100}
        noun="returns"
        exportName="sell-returns"
        minWidth={1100}
        actions={(r) => (
          <ActionsMenu
            label={`Actions for ${r.ref}`}
            actions={[
              { label: "View", icon: "eye", onClick: () => setViewing({ id: r.id }) },
              { label: "Edit", icon: "pencil", href: `/sell-returns/${r.id}/edit` },
              {
                label: "Delete",
                icon: "trash",
                danger: true,
                onClick: () =>
                  setConfirm({
                    tone: "danger",
                    confirmLabel: "Delete",
                    message: `Return ${r.ref} will be deleted and its ${sellReturnTotals(r).items} items taken back out of stock.`,
                    onConfirm: () => {
                      updateSellReturns((prev) => prev.filter((x) => x.id !== r.id));
                      updateProducts((prev) => applySellReturn(prev, r, locationOf(r), customerName(r), -1));
                    },
                  }),
              },
              { label: "Print", icon: "printer", onClick: () => setViewing({ id: r.id, print: true }) },
              { label: "Add payment", icon: "dollar", dividerBefore: true, onClick: () => setPaying(r) },
              { label: "View payments", icon: "receipt", onClick: () => setPayments(r) },
            ]}
          />
        )}
      />

      {viewed && (
        <ViewDialog
          ret={viewed}
          sale={saleOf(viewed)}
          customer={customerName(viewed)}
          autoPrint={viewing?.print}
          onClose={() => setViewing(null)}
        />
      )}

      {paying && (
        <PaymentDialog
          key={paying.id}
          description={`Refund for ${paying.ref} · ${customerName(paying)}`}
          total={sellReturnTotals(paying).total}
          paid={sellReturnTotals(paying).refunded}
          info={[
            [
              ["Customer", customerName(paying)],
              ["Business", customerOf(paying)?.businessName ?? "-"],
            ],
            [
              ["Invoice no", paying.ref],
              ["Location", locationOf(paying)],
            ],
            [
              ["Total amount", USD.format(sellReturnTotals(paying).total)],
              ["Payment note", paying.refunds.at(-1)?.note || "-"],
            ],
          ]}
          advance={customerOf(paying)?.advanceBalance ?? 0}
          onClose={() => setPaying(null)}
          onSave={(payment) => {
            const ref = nextPaymentRef(returns);
            updateSellReturns((prev) =>
              prev.map((x) =>
                x.id === paying.id
                  ? {
                      ...x,
                      refunds: [...x.refunds, { ...payment, ref }],
                      activities: [
                        ...returnActivities(x),
                        { date: payment.date, action: "Payment added", by: "Adnan Ahmed", note: `${ref}: ${USD.format(payment.amount)} by ${payment.method}` },
                      ],
                    }
                  : x,
              ),
            );
            // back to View payments when it was opened from there
            setPaying(null);
          }}
        />
      )}

      {/* hidden while its "Add payment" is open, then shown again */}
      {payments && !paying && (
        <ReturnPaymentsDialog
          ret={returns.find((r) => r.id === payments.id) ?? payments}
          sale={saleOf(payments)}
          customer={customerOf(payments)}
          onAdd={() => setPaying(returns.find((r) => r.id === payments.id) ?? payments)}
          onDelete={(index) => {
            const current = returns.find((r) => r.id === payments.id) ?? payments;
            const refund = current.refunds[index];
            setConfirm({
              tone: "danger",
              confirmLabel: "Delete",
              message: `The ${USD.format(refund.amount)} payment${refund.ref ? ` ${refund.ref}` : ""} will be deleted, and that much becomes due again.`,
              onConfirm: () =>
                updateSellReturns((prev) =>
                  prev.map((x) =>
                    x.id === current.id
                      ? {
                          ...x,
                          refunds: x.refunds.filter((_, i) => i !== index),
                          activities: [
                            ...returnActivities(x),
                            {
                              date: new Date().toISOString().slice(0, 16),
                              action: "Payment deleted",
                              by: "Adnan Ahmed",
                              note: `${refund.ref ?? "Payment"}: ${USD.format(refund.amount)}`,
                            },
                          ],
                        }
                      : x,
                  ),
                ),
            });
          }}
          onClose={() => setPayments(null)}
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

function ViewDialog({
  ret: r,
  sale,
  customer,
  autoPrint,
  onClose,
}: {
  ret: SellReturn;
  sale?: Sale;
  customer: string;
  autoPrint?: boolean;
  onClose: () => void;
}) {
  const t = sellReturnTotals(r);
  useEffect(() => {
    if (!autoPrint) return;
    // let the dialog paint before the print preview opens
    const timer = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(timer);
  }, [autoPrint]);

  return (
    <Modal
      title={`Sell return (Invoice no: ${r.ref})`}
      onClose={onClose}
      className="max-w-4xl"
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
      <div className="grid gap-5 text-[13px] sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-sm font-semibold">Sell return details</p>
          <Info label="Return date">{day(r.date)}</Info>
          <Info label="Customer">{customer}</Info>
          <Info label="Business location">{sale?.location ?? "-"}</Info>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-semibold">Sale details</p>
          <Info label="Invoice no">
            <span className="font-mono">{sale?.invoiceNo ?? "Deleted"}</span>
          </Info>
          <Info label="Date">{sale ? day(sale.date) : "-"}</Info>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="bg-brand-500 text-xs text-white">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Product name</th>
              <th className="px-3 py-2 text-right font-medium">Unit price</th>
              <th className="px-3 py-2 text-right font-medium">Return quantity</th>
              <th className="px-3 py-2 text-right font-medium">Return subtotal</th>
            </tr>
          </thead>
          <tbody>
            {r.lines.map((l, i) => (
              <tr key={l.sku} className="border-b border-line last:border-0">
                <td className="px-3 py-2 text-muted">{i + 1}</td>
                <td className="px-3 py-2">
                  {l.name} <span className="font-mono text-xs text-muted">{l.sku}</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{USD.format(l.unitPrice)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{l.qty.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{USD.format(l.qty * l.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto mt-4 grid w-full max-w-sm grid-cols-[1fr_auto] gap-x-4 divide-y divide-line text-[13px] [&>*]:py-1.5">
        <dt className="text-muted">Net total amount:</dt>
        <dd className="text-right tabular-nums">{USD.format(t.net)}</dd>
        <dt className="text-muted">Return discount:</dt>
        <dd className="text-right tabular-nums">(−) {USD.format(t.discount)}</dd>
        <dt className="text-muted">Total return tax{r.tax ? ` (${r.tax})` : ""}:</dt>
        <dd className="text-right tabular-nums">(+) {USD.format(t.tax)}</dd>
        <dt className="font-semibold">Return total:</dt>
        <dd className="text-right font-semibold tabular-nums">{USD.format(t.total)}</dd>
        <dt className="text-muted">Refunded:</dt>
        <dd className="text-right tabular-nums">{USD.format(t.refunded)}</dd>
        <dt className="font-medium">Payment due:</dt>
        <dd className={cn("text-right font-medium tabular-nums", t.due > 0 ? "text-rose-600" : "text-emerald-600")}>{USD.format(t.due)}</dd>
      </dl>

      <p className="mb-2 mt-5 text-sm font-semibold">Activities</p>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface text-xs text-muted">
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Action</th>
              <th className="px-3 py-2 font-medium">By</th>
              <th className="px-3 py-2 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {returnActivities(r).map((a, i) => (
              <tr key={i} className="border-b border-line last:border-0">
                <td className="px-3 py-2">
                  {day(a.date)} {time(a.date)}
                </td>
                <td className="px-3 py-2">{a.action}</td>
                <td className="px-3 py-2">{a.by}</td>
                <td className="px-3 py-2 text-muted">{a.note || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p>
      <span className="text-muted">{label}:</span> <span className="font-medium">{children}</span>
    </p>
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
