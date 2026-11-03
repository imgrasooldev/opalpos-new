"use client";

/**
 * Sell -> All sales, as in the old Opal POS: filters (location, customer,
 * payment status, date range, user, shipping status, subscriptions) above
 * the sales table, with a totals row (status and method counts, money).
 *
 * Only Final sales are listed. Row actions: View, Print invoice, Edit
 * shipping, Add payment, View payments and Delete (puts the stock back).
 * `printId` (from "Save and print") opens that sale and prints it; `viewId`
 * (the "Parent sale" link on List sell return) just opens it.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { updateCustomers, useCustomers } from "@/components/contacts/customer-store";
import { updateProducts, useHydrated } from "@/components/inventory/product-store";
import { PRODUCT_LOCATIONS } from "@/components/inventory/products-data";
import { PaymentDialog } from "@/components/purchases/payment-dialog";
import {
  SHIPPING_STATUSES,
  applySale,
  applySellReturn,
  lineSubtotal,
  netUnitPrice,
  nextSellReturnRef,
  saleMethod,
  salePaymentStatus,
  saleTotals,
  sellReturnTotals,
  updateSales,
  updateSellReturns,
  useSales,
  useSellReturns,
  type Sale,
  type SellReturn,
} from "@/components/sales/sales-data";
import { SellReturnDialog } from "@/components/sales/sell-return-dialog";
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
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const STATUS_TONE = { Paid: "green", Partial: "amber", Due: "rose" } as const;
const dash = <span className="text-muted">—</span>;

/** "Paid - 2 · Partial - 1", like the old totals row. */
const counts = (values: (string | null)[]) =>
  Object.entries(
    values.reduce<Record<string, number>>((acc, v) => {
      if (v) acc[v] = (acc[v] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([label, n]) => (
    <span key={label} className="block whitespace-nowrap font-normal">
      {label} - {n}
    </span>
  ));

type Filters = { location: string; customer: string; payment: string; from: string; to: string; user: string; shipping: string; subscriptions: boolean };
const NO_FILTERS: Filters = { location: "", customer: "", payment: "", from: "", to: "", user: "", shipping: "", subscriptions: false };

/**
 * `pos` turns this into Sell -> List POS: only sales rung up at the POS, and
 * no Add button (new POS sales come from the POS screen itself).
 */
export function SalesScreen({ printId, viewId, pos = false }: { printId?: number; viewId?: number; pos?: boolean }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const sales = useSales();
  const customers = useCustomers();
  const returns = useSellReturns();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [viewing, setViewing] = useState<{ id: number; print?: boolean } | null>(
    printId ? { id: printId, print: true } : viewId ? { id: viewId } : null,
  );
  const [paying, setPaying] = useState<Sale | null>(null);
  const [payments, setPayments] = useState<Sale | null>(null);
  const [shipping, setShipping] = useState<Sale | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [returning, setReturning] = useState<Sale | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);

  const customerOf = (s: Sale) => customers.find((c) => c.id === s.customerId);
  const customerName = (s: Sale) => customerOf(s)?.name ?? "Unknown customer";
  const returnsOf = (s: Sale) => returns.filter((r) => r.saleId === s.id);
  /** What we still owe the customer for goods they brought back. */
  const returnDue = (s: Sale) => returnsOf(s).reduce((t, r) => t + sellReturnTotals(r).due, 0);
  const listed = (s: Sale) => s.status === "Final" && (!pos || s.source === "POS");
  const finals = sales.filter(listed);
  const active = Object.entries(filters).filter(([k, v]) => v !== NO_FILTERS[k as keyof Filters]).length;

  const rows = useMemo(
    () =>
      sales.filter(
        (s) =>
          s.status === "Final" &&
          (!pos || s.source === "POS") &&
          (!filters.location || s.location === filters.location) &&
          (!filters.customer || s.customerId === Number(filters.customer)) &&
          (!filters.payment || salePaymentStatus(s) === filters.payment) &&
          (!filters.from || s.date.slice(0, 10) >= filters.from) &&
          (!filters.to || s.date.slice(0, 10) <= filters.to) &&
          (!filters.user || s.addedBy === filters.user) &&
          (!filters.shipping || s.shippingStatus === filters.shipping) &&
          // the demo has no subscription invoices
          !filters.subscriptions,
      ),
    [sales, filters, pos],
  );

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const columns: DataColumn<Sale>[] = [
    {
      key: "date",
      label: "Date",
      sortValue: (s) => s.date,
      text: (s) => when(s.date),
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
        <span className="inline-flex items-center gap-1.5">
          <button type="button" onClick={() => setViewing({ id: s.id })} className="font-mono text-[12.5px] font-medium text-brand-500 hover:underline">
            {s.invoiceNo}
          </button>
          {returnsOf(s).length > 0 && (
            <span className="group/ret relative inline-flex" aria-label="Some quantities are returned from this sale" role="img">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-rose-500 text-white">
                <Icon name="refund" className="h-2.5 w-2.5" />
              </span>
              <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-navy-950 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover/ret:block">
                Some quantities are returned from this sale
              </span>
            </span>
          )}
        </span>
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
      key: "payment",
      label: "Payment status",
      sortValue: salePaymentStatus,
      text: salePaymentStatus,
      render: (s) => <Badge tone={STATUS_TONE[salePaymentStatus(s)]}>{salePaymentStatus(s)}</Badge>,
      total: (list) => counts(list.map(salePaymentStatus)),
    },
    {
      key: "method",
      label: "Payment method",
      sortValue: (s) => saleMethod(s) ?? "",
      text: (s) => saleMethod(s) ?? "",
      render: (s) => saleMethod(s) ?? dash,
      total: (list) => counts(list.map(saleMethod)),
    },
    {
      key: "total",
      label: "Total amount",
      sortValue: (s) => saleTotals(s).total,
      text: (s) => saleTotals(s).total.toFixed(2),
      render: (s) => <span className="font-medium tabular-nums">{USD.format(saleTotals(s).total)}</span>,
      align: "right",
      total: (list) => USD.format(list.reduce((t, s) => t + saleTotals(s).total, 0)),
    },
    {
      key: "paid",
      label: "Total paid",
      sortValue: (s) => saleTotals(s).paid,
      text: (s) => saleTotals(s).paid.toFixed(2),
      render: (s) => <span className="tabular-nums">{USD.format(saleTotals(s).paid)}</span>,
      align: "right",
      total: (list) => USD.format(list.reduce((t, s) => t + saleTotals(s).paid, 0)),
    },
    {
      key: "due",
      label: "Sell due",
      sortValue: (s) => saleTotals(s).due,
      text: (s) => saleTotals(s).due.toFixed(2),
      render: (s) => (
        <span
          className={cn(
            "tabular-nums",
            saleTotals(s).due > 0 ? "font-medium text-rose-600" : saleTotals(s).due < 0 ? "text-emerald-600" : "text-muted",
          )}
          // negative: the customer paid more than the total
          title={saleTotals(s).due < 0 ? "Overpaid" : undefined}
        >
          {USD.format(saleTotals(s).due)}
        </span>
      ),
      align: "right",
      total: (list) => USD.format(list.reduce((t, s) => t + saleTotals(s).due, 0)),
    },
    {
      key: "returnDue",
      label: "Sell return due",
      sortValue: returnDue,
      text: (s) => (returnsOf(s).length ? returnDue(s).toFixed(2) : ""),
      render: (s) =>
        returnsOf(s).length ? (
          <button
            type="button"
            onClick={() => setViewing({ id: s.id })}
            className={cn("tabular-nums hover:underline", returnDue(s) > 0 ? "font-medium text-brand-500" : "text-muted")}
          >
            {USD.format(returnDue(s))}
          </button>
        ) : (
          dash
        ),
      align: "right",
      total: (list) => USD.format(list.reduce((t, s) => t + returnDue(s), 0)),
    },
    {
      key: "shipping",
      label: "Shipping status",
      sortValue: (s) => s.shippingStatus ?? "",
      text: (s) => s.shippingStatus ?? "",
      render: (s) => (s.shippingStatus ? <Badge tone={s.shippingStatus === "Delivered" ? "green" : s.shippingStatus === "Cancelled" ? "rose" : "blue"}>{s.shippingStatus}</Badge> : dash),
      total: (list) => counts(list.map((s) => s.shippingStatus)),
    },
    {
      key: "items",
      label: "Total items",
      sortValue: (s) => saleTotals(s).items,
      text: (s) => saleTotals(s).items.toFixed(2),
      align: "right",
    },
    {
      key: "addedBy",
      label: "Added by",
      sortValue: (s) => s.addedBy,
      text: (s) => s.addedBy,
      render: (s) => (
        <span className="inline-flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-50 text-[10px] font-semibold text-brand-600 dark:bg-brand-900 dark:text-brand-200">
            {s.addedBy.split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </span>
          {s.addedBy}
        </span>
      ),
    },
    { key: "sellNote", label: "Sell note", sortValue: (s) => s.sellNote, text: (s) => s.sellNote, render: (s) => s.sellNote || dash },
    { key: "staffNote", label: "Staff note", sortValue: (s) => s.staffNote, text: (s) => s.staffNote, render: (s) => s.staffNote || dash },
    {
      key: "shippingDetails",
      label: "Shipping details",
      sortValue: (s) => s.shippingDetails,
      text: (s) => s.shippingDetails,
      render: (s) => s.shippingDetails || dash,
    },
  ];

  const viewed = viewing && sales.find((s) => s.id === viewing.id);

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
          <FilterSelect label="Payment status" value={filters.payment} onChange={(v) => set("payment", v)} options={[{ value: "", label: "All" }, ...["Paid", "Due", "Partial"].map((s) => ({ value: s, label: s }))]} />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Date range</span>
            <div className="flex items-center gap-1.5">
              <input type="date" aria-label="From date" value={filters.from} onChange={(event) => set("from", event.target.value)} className={cn(fieldClass, "min-w-0 px-2", filters.from ? "border-brand-500/60" : "border-line")} />
              <span className="text-xs text-muted">to</span>
              <input type="date" aria-label="To date" value={filters.to} onChange={(event) => set("to", event.target.value)} className={cn(fieldClass, "min-w-0 px-2", filters.to ? "border-brand-500/60" : "border-line")} />
            </div>
          </div>
          <FilterSelect label="User" value={filters.user} onChange={(v) => set("user", v)} options={[{ value: "", label: "All" }, ...DEMO_USERS.map((u) => ({ value: u.name, label: u.name }))]} />
          <FilterSelect label="Shipping status" value={filters.shipping} onChange={(v) => set("shipping", v)} options={[{ value: "", label: "All" }, ...SHIPPING_STATUSES.map((s) => ({ value: s, label: s }))]} />
          <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-[13px] text-muted">
            <input type="checkbox" checked={filters.subscriptions} onChange={(event) => set("subscriptions", event.target.checked)} className="h-4 w-4 accent-brand-500" />
            Subscriptions
          </label>
        </div>
      </Card>

      <DataTable
        title={pos ? "List POS" : "All sales"}
        subtitle={active > 0 ? `${rows.length} of ${finals.length} sales match the filters` : `${finals.length} sales`}
        rows={rows}
        columns={columns}
        rowKey={(s) => s.id}
        defaultSort={{ key: "date", direction: "desc" }}
        defaultPageSize={100}
        noun="sales"
        exportName={pos ? "pos-sales" : "sales"}
        minWidth={1900}
        actionsPosition="start"
        headerAction={
          pos ? undefined : (
            <Link
              href="/sales/create"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
            >
              <Icon name="plus" className="h-4 w-4" />
              Add
            </Link>
          )
        }
        actions={(s) => (
          <ActionsMenu
            label={`Actions for ${s.invoiceNo}`}
            actions={[
              { label: "View", icon: "eye", onClick: () => setViewing({ id: s.id }) },
              { label: "Print invoice", icon: "printer", onClick: () => setViewing({ id: s.id, print: true }) },
              { label: "Edit shipping", icon: "truck", onClick: () => setShipping(s) },
              {
                label: "Delete",
                icon: "trash",
                danger: true,
                onClick: () =>
                  returnsOf(s).length
                    ? setBlocked(
                        `Invoice ${s.invoiceNo} has sell returns (${returnsOf(s).map((r) => r.ref).join(", ")}). Delete those first.`,
                      )
                    : setConfirm({
                    tone: "danger",
                    confirmLabel: "Delete",
                    message: `Invoice ${s.invoiceNo} will be deleted and its ${saleTotals(s).items} items put back into stock.`,
                    onConfirm: () => {
                      updateSales((prev) => prev.filter((x) => x.id !== s.id));
                      updateProducts((prev) => applySale(prev, s, customerName(s), -1));
                      if (s.pointsRedeemed)
                        updateCustomers((prev) => prev.map((c) => (c.id === s.customerId ? { ...c, opalPoints: c.opalPoints + s.pointsRedeemed } : c)));
                    },
                  }),
              },
              { label: "Add payment", icon: "dollar", dividerBefore: true, onClick: () => setPaying(s) },
              { label: "View payments", icon: "receipt", onClick: () => setPayments(s) },
              { label: "Sell return", icon: "refund", onClick: () => setReturning(s) },
            ]}
          />
        )}
      />

      {/* waits for the browser store, so a sale saved a moment ago is found */}
      {hydrated && viewed && (
        <ViewDialog
          sale={viewed}
          customer={customerOf(viewed)}
          returns={returnsOf(viewed)}
          onDeleteReturn={(r) =>
            setConfirm({
              tone: "danger",
              confirmLabel: "Delete",
              message: `Return ${r.ref} will be deleted and its ${sellReturnTotals(r).items} items taken back out of stock.`,
              onConfirm: () => {
                updateSellReturns((prev) => prev.filter((x) => x.id !== r.id));
                updateProducts((prev) => applySellReturn(prev, r, viewed.location, customerName(viewed), -1));
              },
            })
          }
          autoPrint={viewing?.print}
          onClose={() => {
            setViewing(null);
            if (printId || viewId) router.replace("/sales");
          }}
        />
      )}

      {paying && (
        <PaymentDialog
          key={paying.id}
          description={`Invoice ${paying.invoiceNo} · ${customerName(paying)}`}
          total={saleTotals(paying).total}
          paid={saleTotals(paying).paid}
          onClose={() => setPaying(null)}
          onSave={(payment) => {
            updateSales((prev) => prev.map((x) => (x.id === paying.id ? { ...x, payments: [...x.payments, payment] } : x)));
            setPaying(null);
          }}
        />
      )}

      {payments && (
        <PaymentsDialog
          sale={sales.find((s) => s.id === payments.id) ?? payments}
          onClose={() => setPayments(null)}
          onAdd={() => {
            setPaying(sales.find((s) => s.id === payments.id) ?? payments);
            setPayments(null);
          }}
        />
      )}

      {shipping && (
        <ShippingDialog
          key={shipping.id}
          sale={shipping}
          onClose={() => setShipping(null)}
          onSave={(patch) => {
            updateSales((prev) => prev.map((x) => (x.id === shipping.id ? { ...x, ...patch } : x)));
            setShipping(null);
          }}
        />
      )}

      {returning && (
        <SellReturnDialog
          key={returning.id}
          sale={returning}
          customerName={customerName(returning)}
          returns={returns}
          onClose={() => setReturning(null)}
          onSave={(values) => {
            const ret: SellReturn = {
              id: Math.max(0, ...returns.map((r) => r.id)) + 1,
              ref: nextSellReturnRef(returns),
              saleId: returning.id,
              addedBy: "Adnan Ahmed",
              ...values,
              activities: [{ date: values.date, action: "Added", by: "Adnan Ahmed", note: "" }],
            };
            updateSellReturns((prev) => [...prev, ret]);
            updateProducts((prev) => applySellReturn(prev, ret, returning.location, customerName(returning), 1));
            setReturning(null);
          }}
        />
      )}

      {blocked && (
        <Modal
          title="Can't delete this sale"
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
  sale: s,
  customer,
  returns,
  onDeleteReturn,
  autoPrint,
  onClose,
}: {
  sale: Sale;
  returns: SellReturn[];
  onDeleteReturn: (r: SellReturn) => void;
  customer?: { name: string; mobile: string | null; address: string | null; businessName: string | null };
  autoPrint?: boolean;
  onClose: () => void;
}) {
  const t = saleTotals(s);
  useEffect(() => {
    if (!autoPrint) return;
    // let the dialog paint before the print preview opens
    const timer = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(timer);
  }, [autoPrint]);

  return (
    <Modal
      title={`Sell details (Invoice no: ${s.invoiceNo})`}
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
          <p className="text-xs text-muted">Customer</p>
          <p className="font-medium">{customer?.name ?? "Unknown"}</p>
          {customer && (
            <p className="text-muted">
              {customer.businessName && <>{customer.businessName}<br /></>}
              {customer.address && <>{customer.address}<br /></>}
              {customer.mobile}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted">Location</p>
          <p className="font-medium">{s.location}</p>
          <p className="mt-2 text-xs text-muted">Date</p>
          <p>{when(s.date)}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p>
            <span className="text-muted">Payment status:</span>{" "}
            <Badge tone={STATUS_TONE[salePaymentStatus(s)]}>{salePaymentStatus(s)}</Badge>
          </p>
          {s.payTerm && <p className="text-muted">Pay term: {s.payTerm}</p>}
          {s.shippingStatus && <p className="text-muted">Shipping: {s.shippingStatus}</p>}
          <p className="text-muted">Added by: {s.addedBy}</p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[600px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface text-xs text-muted">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 text-right font-medium">Quantity</th>
              <th className="px-3 py-2 text-right font-medium">Unit price</th>
              <th className="px-3 py-2 text-right font-medium">Discount</th>
              <th className="px-3 py-2 text-right font-medium">Price after discount</th>
              <th className="px-3 py-2 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {s.lines.map((l, i) => (
              <tr key={l.sku} className="border-b border-line last:border-0">
                <td className="px-3 py-2 text-muted">{i + 1}</td>
                <td className="px-3 py-2">
                  {l.name} <span className="font-mono text-xs text-muted">{l.sku}</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{l.qty.toFixed(2)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{USD.format(l.unitPrice)}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {l.discount ? (l.discountType === "Percentage" ? `${l.discount}%` : USD.format(l.discount)) : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{USD.format(netUnitPrice(l))}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{USD.format(lineSubtotal(l))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {returns.length > 0 && (
        <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50/50 p-3 text-[13px] dark:border-rose-900 dark:bg-rose-950/40">
          <p className="mb-2 flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-300">
            <Icon name="refund" className="h-4 w-4" />
            Sell returns
          </p>
          <ul className="divide-y divide-rose-200/70 dark:divide-rose-900">
            {returns.map((r) => {
              const rt = sellReturnTotals(r);
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                  <span>
                    <span className="font-mono">{r.ref}</span> · {when(r.date)} ·{" "}
                    {r.lines.map((l) => `${l.name} × ${l.qty}`).join(", ")}
                  </span>
                  <span className="flex items-center gap-3 tabular-nums">
                    {USD.format(rt.total)}
                    <span className="text-xs text-muted">{rt.due > 0 ? `${USD.format(rt.due)} to refund` : "Refunded"}</span>
                    <button
                      type="button"
                      aria-label={`Delete return ${r.ref}`}
                      onClick={() => onDeleteReturn(r)}
                      className="rounded p-1 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900"
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="text-[13px]">
          <p className="mb-2 font-semibold">Payments</p>
          <PaymentList sale={s} />
          {s.sellNote && <p className="mt-3"><span className="text-muted">Sell note:</span> {s.sellNote}</p>}
          {s.staffNote && <p><span className="text-muted">Staff note:</span> {s.staffNote}</p>}
          {s.shippingDetails && <p><span className="text-muted">Shipping details:</span> {s.shippingDetails}</p>}
        </div>
        <dl className="grid grid-cols-2 gap-y-1 self-start text-[13px]">
          <Row label="Total">{USD.format(t.subtotal)}</Row>
          <Row label="Discount">(−) {USD.format(t.discount)}</Row>
          {t.points > 0 && <Row label={`Opal Points (${s.pointsRedeemed})`}>(−) {USD.format(t.points)}</Row>}
          <Row label={`Order tax${s.orderTax ? ` (${s.orderTax})` : ""}`}>(+) {USD.format(t.tax)}</Row>
          <Row label="Shipping">(+) {USD.format(s.shippingCharges)}</Row>
          {s.expenses.map((e, i) => (
            <Row key={i} label={e.name || "Additional expense"}>(+) {USD.format(e.amount)}</Row>
          ))}
          <dt className="border-t border-line pt-1 font-semibold">Total payable:</dt>
          <dd className="border-t border-line pt-1 text-right font-semibold tabular-nums">{USD.format(t.total)}</dd>
          <Row label="Total paid">{USD.format(t.paid)}</Row>
          <dt className="font-medium">Total remaining:</dt>
          <dd className={cn("text-right font-medium tabular-nums", t.due > 0 ? "text-rose-600" : "text-emerald-600")}>{USD.format(Math.max(0, t.due))}</dd>
        </dl>
      </div>
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted">{label}:</dt>
      <dd className="text-right tabular-nums">{children}</dd>
    </>
  );
}

function PaymentList({ sale }: { sale: Sale }) {
  if (sale.payments.length === 0) return <p className="text-[13px] text-muted">No payments yet.</p>;
  return (
    <ul className="divide-y divide-line rounded-lg border border-line text-[13px]">
      {sale.payments.map((p, i) => (
        <li key={i} className="flex items-center justify-between gap-3 px-3 py-2">
          <span>
            {when(p.date)} · {p.method}
            {p.note && <span className="text-muted"> · {p.note}</span>}
          </span>
          <span className="font-medium tabular-nums">{USD.format(p.amount)}</span>
        </li>
      ))}
    </ul>
  );
}

function PaymentsDialog({ sale, onClose, onAdd }: { sale: Sale; onClose: () => void; onAdd: () => void }) {
  const t = saleTotals(sale);
  return (
    <Modal
      title="View payments"
      description={`Invoice ${sale.invoiceNo} · total ${USD.format(t.total)} · paid ${USD.format(t.paid)}`}
      onClose={onClose}
      className="max-w-lg"
      footer={
        <>
          {t.due > 0 && (
            <Button type="button" variant="brand" onClick={onAdd}>
              <Icon name="plus" className="h-4 w-4" />
              Add payment
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <PaymentList sale={sale} />
    </Modal>
  );
}

function ShippingDialog({
  sale,
  onClose,
  onSave,
}: {
  sale: Sale;
  onClose: () => void;
  onSave: (patch: Pick<Sale, "shippingDetails" | "shippingAddress" | "shippingStatus" | "deliveredTo">) => void;
}) {
  const [details, setDetails] = useState(sale.shippingDetails);
  const [address, setAddress] = useState(sale.shippingAddress);
  const [status, setStatus] = useState(sale.shippingStatus ?? "");
  const [deliveredTo, setDeliveredTo] = useState(sale.deliveredTo);

  return (
    <Modal
      title="Edit shipping"
      description={`Invoice ${sale.invoiceNo}`}
      onClose={onClose}
      className="max-w-lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            variant="brand"
            onClick={() =>
              onSave({
                shippingDetails: details.trim(),
                shippingAddress: address.trim(),
                shippingStatus: (status || null) as Sale["shippingStatus"],
                deliveredTo: deliveredTo.trim(),
              })
            }
          >
            Update
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Shipping details</span>
          <textarea rows={2} value={details} onChange={(event) => setDetails(event.target.value)} className={cn(fieldClass, "border-line px-3")} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Shipping address</span>
          <textarea rows={2} value={address} onChange={(event) => setAddress(event.target.value)} className={cn(fieldClass, "border-line px-3")} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <FilterSelect
            label="Shipping status"
            value={status}
            onChange={setStatus}
            options={[{ value: "", label: "Please select" }, ...SHIPPING_STATUSES.map((s) => ({ value: s, label: s }))]}
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Delivered to</span>
            <input value={deliveredTo} onChange={(event) => setDeliveredTo(event.target.value)} className={cn(fieldClass, "border-line px-3")} />
          </label>
        </div>
      </div>
    </Modal>
  );
}

// ---------- pieces ----------

const fieldClass =
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
