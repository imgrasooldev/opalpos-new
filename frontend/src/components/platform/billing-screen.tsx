"use client";

/**
 * Platform admin -> Billing: invoices, payments and renewals.
 *   - tiles: collected this month, unpaid, overdue, renewals due now
 *   - "Run renewals": issues the invoice for every billing period that has
 *     started; card subscriptions are charged at once, bank and cash ones
 *     wait for payment (normally a daily job; here a button)
 *   - upcoming renewals for the next 14 days
 *   - every invoice: view / print, record a payment (card, bank, cash),
 *     send a reminder, void; plus one-off manual invoices
 * Overdue invoices past the grace period suspend the business (see
 * Settings -> Billing); paying them switches it back on.
 */

import Link from "next/link";
import { useMemo, useState } from "react";

import { useHydrated } from "@/components/inventory/product-store";
import {
  PAY_METHODS,
  USD,
  dayFrom,
  days,
  daysBetween,
  fmtDate,
  nextInvoiceNo,
  renewalsDue,
  runRenewals,
  subscriptionPrice,
  today,
  updateInvoices,
  updateSubscriptions,
  useBusinesses,
  useFeatures,
  useInvoices,
  usePlans,
  usePlatformSettings,
  useSubscriptions,
  type Invoice,
  type PayMethod,
} from "@/components/platform/platform-data";
import { Field, FilterCard, FilterSelect, Select, Tile, filterClass, inputClass } from "@/components/platform/platform-ui";
import { ActionsMenu, type MenuAction } from "@/components/ui/actions-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";

type Shown = "Paid" | "Unpaid" | "Overdue" | "Void";
const shownStatus = (i: Invoice, on = today()): Shown => (i.status === "Unpaid" && i.dueDate < on ? "Overdue" : i.status);
const TONE: Record<Shown, "green" | "amber" | "rose" | "neutral"> = { Paid: "green", Unpaid: "amber", Overdue: "rose", Void: "neutral" };

type Filters = { business: string; status: string; kind: string; method: string; from: string; to: string };
const NO_FILTERS: Filters = { business: "", status: "", kind: "", method: "", from: "", to: "" };

export function BillingScreen({ initialBusiness, initialStatus }: { initialBusiness?: string; initialStatus?: string }) {
  const hydrated = useHydrated();
  const invoices = useInvoices();
  const subs = useSubscriptions();
  const businesses = useBusinesses();
  const plans = usePlans();
  const features = useFeatures();
  const settings = usePlatformSettings();
  const [filters, setFilters] = useState<Filters>({ ...NO_FILTERS, business: initialBusiness ?? "", status: initialStatus ?? "" });
  const [viewing, setViewing] = useState<number | null>(null);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const on = today();
  const nameOf = (id: number) => businesses.find((b) => b.id === id)?.name ?? "Deleted business";
  const rows = useMemo(
    () =>
      invoices.filter(
        (i) =>
          (!filters.business || i.businessId === Number(filters.business)) &&
          (!filters.status || shownStatus(i, on) === filters.status) &&
          (!filters.kind || i.kind === filters.kind) &&
          (!filters.method || i.method === filters.method) &&
          (!filters.from || i.date >= filters.from) &&
          (!filters.to || i.date <= filters.to),
      ),
    [invoices, filters, on],
  );
  const active = Object.entries(filters).filter(([k, v]) => v !== NO_FILTERS[k as keyof Filters]).length;
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((prev) => ({ ...prev, [key]: value }));
  const sum = (list: Invoice[]) => list.reduce((t, i) => t + i.total, 0);

  const month = on.slice(0, 7);
  const collected = invoices.filter((i) => i.status === "Paid" && i.paidAt.startsWith(month));
  const unpaid = invoices.filter((i) => i.status === "Unpaid");
  const overdue = unpaid.filter((i) => i.dueDate < on);
  const due = renewalsDue(subs, invoices, businesses, on);
  const upcoming = subs
    .filter((s) => s.autoRenew && !businesses.find((b) => b.id === s.businessId)?.suspended)
    .map((s) => {
      const invoiced = invoices.some((i) => i.businessId === s.businessId && i.periodStart === s.periodStart && i.status !== "Void");
      return { s, date: invoiced ? dayFrom(1, s.periodEnd) : s.periodStart };
    })
    .filter((x) => x.date >= on && x.date <= dayFrom(14, on))
    .sort((a, b) => a.date.localeCompare(b.date));

  function renew() {
    const result = runRenewals(subs, invoices, plans, features, businesses, settings.invoicePrefix || "OP", on);
    updateSubscriptions(() => result.subs);
    updateInvoices(() => result.invoices);
    const paid = result.created.filter((i) => i.status === "Paid");
    setNotice(
      result.created.length
        ? `Issued ${result.created.length} invoice${result.created.length === 1 ? "" : "s"}: ${paid.length} charged to card (${USD.format(sum(paid))}), ${result.created.length - paid.length} waiting for payment.`
        : "Nothing to renew today.",
    );
  }

  const remind = (i: Invoice) => {
    updateInvoices((prev) => prev.map((x) => (x.id === i.id ? { ...x, reminders: [...x.reminders, on] } : x)));
    setNotice(`Reminder for ${i.invoiceNo} sent to ${businesses.find((b) => b.id === i.businessId)?.ownerEmail ?? "the owner"}.`);
  };

  const columns: DataColumn<Invoice>[] = [
    {
      key: "no",
      label: "Invoice",
      sortValue: (i) => i.invoiceNo,
      text: (i) => i.invoiceNo,
      render: (i) => (
        <button type="button" onClick={() => setViewing(i.id)} className="font-mono text-[12.5px] font-medium text-brand-500 hover:underline">
          {i.invoiceNo}
        </button>
      ),
    },
    { key: "date", label: "Date", sortValue: (i) => i.date, text: (i) => fmtDate(i.date), render: (i) => <span className="whitespace-nowrap">{fmtDate(i.date)}</span> },
    {
      key: "business",
      label: "Business",
      sortValue: (i) => nameOf(i.businessId),
      text: (i) => nameOf(i.businessId),
      render: (i) => (
        <Link href={`/platform/businesses/${i.businessId}`} className="hover:text-brand-500 hover:underline">
          {nameOf(i.businessId)}
        </Link>
      ),
    },
    {
      key: "period",
      label: "Period",
      sortValue: (i) => i.periodStart,
      text: (i) => `${fmtDate(i.periodStart)} - ${fmtDate(i.periodEnd)}`,
      render: (i) => (
        <span className="leading-tight">
          <span className="block whitespace-nowrap text-xs">
            {fmtDate(i.periodStart)} - {fmtDate(i.periodEnd)}
          </span>
          <span className="block text-xs text-muted">{i.kind}</span>
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortValue: (i) => shownStatus(i, on),
      text: (i) => shownStatus(i, on),
      render: (i) => {
        const s = shownStatus(i, on);
        return (
          <span className="leading-tight">
            <Badge tone={TONE[s]}>{s}</Badge>
            {s === "Overdue" && <span className="mt-0.5 block text-xs text-rose-600">{days(daysBetween(i.dueDate, on))} late</span>}
            {s === "Unpaid" && <span className="mt-0.5 block text-xs text-muted">due {fmtDate(i.dueDate)}</span>}
            {i.reminders.length > 0 && i.status === "Unpaid" && <span className="block text-xs text-muted">{i.reminders.length} reminder{i.reminders.length === 1 ? "" : "s"} sent</span>}
          </span>
        );
      },
    },
    {
      key: "method",
      label: "Paid by",
      sortValue: (i) => i.method,
      text: (i) => `${i.method} ${i.ref}`,
      render: (i) => (
        <span className="leading-tight">
          <span className="block">{i.method}</span>
          {i.status === "Paid" && <span className="block text-xs text-muted">{fmtDate(i.paidAt)}</span>}
        </span>
      ),
    },
    {
      key: "total",
      label: "Amount",
      sortValue: (i) => i.total,
      text: (i) => i.total.toFixed(2),
      render: (i) => <span className={cn("font-medium tabular-nums", i.status === "Void" && "text-muted line-through")}>{USD.format(i.total)}</span>,
      align: "right",
      total: (list) => (
        <span className="flex flex-col items-end text-[12px] font-normal">
          <span>
            Paid: <b className="tabular-nums">{USD.format(sum(list.filter((i) => i.status === "Paid")))}</b>
          </span>
          <span className="text-muted">
            Unpaid: <b className="tabular-nums">{USD.format(sum(list.filter((i) => i.status === "Unpaid")))}</b>
          </span>
        </span>
      ),
    },
  ];

  if (!hydrated) return <p className="py-10 text-center text-[13px] text-muted">Loading…</p>;
  const viewed = invoices.find((i) => i.id === viewing);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile icon="dollar" tone="green" label="Collected this month" value={USD.format(sum(collected))} sub={`${collected.length} paid invoice${collected.length === 1 ? "" : "s"}`} />
        <Tile icon="receipt" tone="amber" label="Unpaid" value={USD.format(sum(unpaid))} sub={`${unpaid.length} invoice${unpaid.length === 1 ? "" : "s"} waiting`} />
        <Tile
          icon="alert"
          tone="rose"
          label="Overdue"
          value={USD.format(sum(overdue))}
          sub={overdue.length ? `${overdue.length} late · oldest ${days(Math.max(...overdue.map((i) => daysBetween(i.dueDate, on))))}` : "Nothing late"}
        />
        <div className="flex items-start gap-3 rounded-xl border border-line bg-background p-4 shadow-sm shadow-navy-950/[0.03]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900 dark:text-brand-200">
            <Icon name="calendar" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-muted">Renewals due now</p>
            <p className="mt-0.5 text-xl font-semibold tabular-nums">{due}</p>
            <Button type="button" variant={due ? "brand" : "secondary"} size="sm" className="mt-2" onClick={renew}>
              <Icon name="transfer" className="h-3.5 w-3.5" />
              Run renewals
            </Button>
          </div>
        </div>
      </div>

      {notice && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[13px] text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <Icon name="check" className="h-4 w-4" />
          {notice}
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)} className="ml-auto rounded p-0.5 hover:bg-emerald-100">
            <Icon name="close" className="h-3.5 w-3.5" />
          </button>
        </p>
      )}

      <Card title="Coming up" action={<span className="text-xs text-muted">Renewals in the next 14 days</span>} bodyClassName="p-0">
        {upcoming.length === 0 ? (
          <p className="px-5 py-6 text-center text-[13px] text-muted">No renewals in the next 14 days.</p>
        ) : (
          <ul className="divide-y divide-line">
            {upcoming.map(({ s, date }) => (
              <li key={s.businessId} className="flex flex-wrap items-center gap-3 px-5 py-2.5 text-[13px]">
                <span className="w-28 whitespace-nowrap text-muted">{date === on ? "Today" : fmtDate(date)}</span>
                <Link href={`/platform/businesses/${s.businessId}`} className="font-medium hover:text-brand-500 hover:underline">
                  {nameOf(s.businessId)}
                </Link>
                <span className="text-xs text-muted">
                  {s.cycle} · {s.method === "Card" ? "charged to card" : `invoice by ${s.method.toLowerCase()}`}
                </span>
                <span className="ml-auto font-semibold tabular-nums">{USD.format(subscriptionPrice(s, plans, features))}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <FilterCard active={active} onReset={() => setFilters(NO_FILTERS)}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <FilterSelect label="Business" icon="building" value={filters.business} onChange={(v) => set("business", v)} options={[{ value: "", label: "All businesses" }, ...businesses.map((b) => ({ value: String(b.id), label: b.name }))]} />
          <FilterSelect label="Status" icon="check" value={filters.status} onChange={(v) => set("status", v)} options={[{ value: "", label: "All" }, ...(["Paid", "Unpaid", "Overdue", "Void"] as const).map((s) => ({ value: s, label: s }))]} />
          <FilterSelect label="Kind" icon="receipt" value={filters.kind} onChange={(v) => set("kind", v)} options={[{ value: "", label: "All" }, ...["New", "Renewal", "Manual"].map((k) => ({ value: k, label: k }))]} />
          <FilterSelect label="Paid by" icon="card" value={filters.method} onChange={(v) => set("method", v)} options={[{ value: "", label: "All" }, ...PAY_METHODS.map((m) => ({ value: m, label: m }))]} />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Invoice date</span>
            <div className="flex items-center gap-1.5">
              <input type="date" aria-label="From date" value={filters.from} onChange={(event) => set("from", event.target.value)} className={cn(filterClass, "min-w-0 px-2", filters.from ? "border-brand-500/60" : "border-line")} />
              <input type="date" aria-label="To date" value={filters.to} onChange={(event) => set("to", event.target.value)} className={cn(filterClass, "min-w-0 px-2", filters.to ? "border-brand-500/60" : "border-line")} />
            </div>
          </div>
        </div>
      </FilterCard>

      <DataTable
        title="Invoices"
        subtitle={active > 0 ? `${rows.length} of ${invoices.length} invoices match the filters` : `${invoices.length} invoices`}
        rows={rows}
        columns={columns}
        rowKey={(i) => i.id}
        defaultSort={{ key: "date", direction: "desc" }}
        defaultPageSize={25}
        noun="invoices"
        exportName="platform-invoices"
        minWidth={1150}
        actionsPosition="start"
        rowClassName={(i) => (shownStatus(i, on) === "Overdue" ? "bg-rose-50/50 dark:bg-rose-950/20" : undefined)}
        headerAction={
          <Button type="button" variant="secondary" onClick={() => setCreating(true)}>
            <Icon name="plus" className="h-4 w-4" />
            New invoice
          </Button>
        }
        actions={(i) => {
          const actions: MenuAction[] = [{ label: i.status === "Paid" ? "View receipt" : "View invoice", icon: "eye", onClick: () => setViewing(i.id) }];
          if (i.status === "Unpaid") {
            actions.push({ label: "Record payment", icon: "dollar", onClick: () => setPaying(i) });
            actions.push({ label: "Send reminder", icon: "mail", onClick: () => remind(i) });
            actions.push({
              label: "Void",
              icon: "close",
              danger: true,
              dividerBefore: true,
              onClick: () =>
                setConfirm({
                  tone: "danger",
                  confirmLabel: "Void",
                  message: `${i.invoiceNo} (${USD.format(i.total)}) won't be collected. It stays in the list, crossed out.`,
                  onConfirm: () => updateInvoices((prev) => prev.map((x) => (x.id === i.id ? { ...x, status: "Void" } : x))),
                }),
            });
          }
          return <ActionsMenu label={`Actions for ${i.invoiceNo}`} actions={actions} />;
        }}
      />

      {viewed && <InvoiceDialog invoice={viewed} onClose={() => setViewing(null)} onPay={() => setPaying(viewed)} onRemind={() => remind(viewed)} />}
      {paying && <PaymentDialog key={paying.id} invoice={paying} business={nameOf(paying.businessId)} onClose={() => setPaying(null)} />}
      {creating && <ManualInvoiceDialog onClose={() => setCreating(false)} />}
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

/** An invoice (or, once paid, its receipt) as the business gets it. Printable. */
export function InvoiceDialog({ invoice: i, onClose, onPay, onRemind }: { invoice: Invoice; onClose: () => void; onPay?: () => void; onRemind?: () => void }) {
  const settings = usePlatformSettings();
  const businesses = useBusinesses();
  const b = businesses.find((x) => x.id === i.businessId);
  const s = shownStatus(i);
  const net = settings.invoiceTax ? i.total / (1 + settings.invoiceTax / 100) : i.total;

  return (
    <Modal
      title={`${i.status === "Paid" ? "Receipt" : "Invoice"} ${i.invoiceNo}`}
      onClose={onClose}
      className="max-w-2xl"
      footer={
        <>
          {i.status === "Unpaid" && onRemind && (
            <Button type="button" variant="secondary" onClick={onRemind}>
              <Icon name="mail" className="h-4 w-4" />
              Send reminder
            </Button>
          )}
          {i.status === "Unpaid" && onPay && (
            <Button type="button" variant="secondary" onClick={onPay}>
              <Icon name="dollar" className="h-4 w-4" />
              Record payment
            </Button>
          )}
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold">{settings.appName}</p>
          <p className="whitespace-pre-line text-[13px] text-muted">{settings.invoiceAddress}</p>
          <p className="text-[13px] text-muted">{settings.supportEmail}</p>
        </div>
        <div className="text-right text-[13px]">
          <Badge tone={TONE[s]}>{s}</Badge>
          <p className="mt-2">
            <span className="text-muted">No:</span> <span className="font-mono font-medium">{i.invoiceNo}</span>
          </p>
          <p>
            <span className="text-muted">Date:</span> {fmtDate(i.date)}
          </p>
          <p>
            <span className="text-muted">Due:</span> {fmtDate(i.dueDate)}
          </p>
        </div>
      </div>
      <div className="mt-5 rounded-lg border border-line px-4 py-3 text-[13px]">
        <p className="text-xs text-muted">Billed to</p>
        <p className="font-medium">{b?.name ?? "Deleted business"}</p>
        {b && (
          <p className="text-muted">
            {b.ownerName} · {b.ownerEmail}
            <br />
            {[b.address, b.city, b.country].filter(Boolean).join(", ")}
          </p>
        )}
      </div>
      <p className="mt-4 text-xs text-muted">
        {i.kind === "Manual" ? "One-off charge" : `${i.kind === "New" ? "First" : "Renewal"} period ${fmtDate(i.periodStart)} - ${fmtDate(i.periodEnd)}`}
      </p>
      <table className="mt-1 w-full text-left text-[13px]">
        <tbody>
          {i.lines.map((l) => (
            <tr key={l.label} className="border-b border-line">
              <td className={cn("py-2", l.amount < 0 && "text-emerald-600")}>{l.label}</td>
              <td className="py-2 text-right tabular-nums">{USD.format(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="ml-auto mt-3 grid w-64 grid-cols-2 gap-y-1 text-[13px]">
        <dt className="text-muted">Subtotal</dt>
        <dd className="text-right tabular-nums">{USD.format(net)}</dd>
        <dt className="text-muted">Tax ({settings.invoiceTax}%)</dt>
        <dd className="text-right tabular-nums">{USD.format(i.total - net)}</dd>
        <dt className="border-t border-line pt-1 font-semibold">Total</dt>
        <dd className="border-t border-line pt-1 text-right font-semibold tabular-nums">{USD.format(i.total)}</dd>
      </dl>
      <p className="mt-4 text-[13px] text-muted">
        {i.status === "Paid" ? (
          <>
            Paid {fmtDate(i.paidAt)} by {i.method.toLowerCase()}
            {i.ref && <span className="font-mono"> · {i.ref}</span>}
          </>
        ) : i.status === "Void" ? (
          "Voided; nothing to pay."
        ) : (
          `To pay by ${i.method.toLowerCase()}.${i.reminders.length ? ` Reminders sent: ${i.reminders.map(fmtDate).join(", ")}.` : ""}`
        )}
      </p>
      {settings.invoiceFooter && <p className="mt-3 border-t border-line pt-3 text-center text-xs text-muted">{settings.invoiceFooter}</p>}
    </Modal>
  );
}

/** Record a card, bank or cash payment against an invoice. */
export function PaymentDialog({ invoice, business, onClose }: { invoice: Invoice; business: string; onClose: () => void }) {
  const [method, setMethod] = useState<PayMethod>(invoice.method);
  const [date, setDate] = useState(today);
  const [ref, setRef] = useState("");
  return (
    <Modal
      title="Record payment"
      description={`${business} · ${invoice.invoiceNo} · ${USD.format(invoice.total)}`}
      onClose={onClose}
      className="max-w-md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            variant="brand"
            onClick={() => {
              updateInvoices((prev) => prev.map((x) => (x.id === invoice.id ? { ...x, status: "Paid", method, paidAt: date, ref: ref.trim() } : x)));
              onClose();
            }}
          >
            Mark as paid
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Paid by">
          <Select label="Paid by" value={method} onChange={(v) => setMethod(v as PayMethod)}>
            {PAY_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>
        <Field label="Paid on">
          <input type="date" aria-label="Paid on" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
        </Field>
        <Field label="Reference" hint={method === "Bank transfer" ? "Wire or transfer id" : method === "Cash" ? "Receipt number" : "Card transaction id"} className="sm:col-span-2">
          <input aria-label="Reference" value={ref} onChange={(event) => setRef(event.target.value)} className={inputClass} />
        </Field>
      </div>
      <p className="mt-3 text-xs text-muted">A business suspended for this invoice is switched back on once nothing overdue is left.</p>
    </Modal>
  );
}

/** A one-off invoice: setup fee, training, hardware… */
function ManualInvoiceDialog({ onClose }: { onClose: () => void }) {
  const businesses = useBusinesses();
  const invoices = useInvoices();
  const settings = usePlatformSettings();
  const [bizId, setBizId] = useState("");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PayMethod>("Bank transfer");
  const [due, setDue] = useState(() => dayFrom(7));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function save() {
    const next: Record<string, string> = {};
    if (!bizId) next.business = "Pick the business";
    if (!label.trim()) next.label = "What is it for?";
    if (!(Number(amount) > 0)) next.amount = "Enter the amount";
    setErrors(next);
    if (Object.keys(next).length) return;
    const on = today();
    updateInvoices((prev) => [
      ...prev,
      {
        id: Math.max(0, ...prev.map((i) => i.id)) + 1,
        invoiceNo: nextInvoiceNo(invoices, settings.invoicePrefix || "OP"),
        businessId: Number(bizId),
        kind: "Manual",
        date: on,
        dueDate: due,
        periodStart: on,
        periodEnd: on,
        lines: [{ label: label.trim(), amount: Number(amount) }],
        total: Number(amount),
        status: "Unpaid",
        paidAt: "",
        method,
        ref: "",
        reminders: [],
      },
    ]);
    onClose();
  }

  return (
    <Modal
      title="New invoice"
      description="A one-off charge outside the subscription."
      onClose={onClose}
      className="max-w-lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="brand" onClick={save}>
            Create invoice
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business *" error={errors.business} className="sm:col-span-2">
          <Select label="Business" value={bizId} onChange={setBizId} error={Boolean(errors.business)}>
            <option value="">Please select</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description *" error={errors.label} className="sm:col-span-2">
          <input aria-label="Description" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Setup and data import" className={cn(inputClass, errors.label && "border-red-500")} />
        </Field>
        <Field label="Amount *" error={errors.amount}>
          <span className="relative block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">$</span>
            <input aria-label="Amount" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className={cn(inputClass, "pl-7", errors.amount && "border-red-500")} />
          </span>
        </Field>
        <Field label="Due on">
          <input type="date" aria-label="Due on" value={due} onChange={(event) => setDue(event.target.value)} className={inputClass} />
        </Field>
        <Field label="To pay by" className="sm:col-span-2">
          <Select label="To pay by" value={method} onChange={(v) => setMethod(v as PayMethod)}>
            {PAY_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
