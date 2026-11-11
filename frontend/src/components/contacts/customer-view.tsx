"use client";

/**
 * View Contact: contact switcher, profile card, and tabs — Ledger, Sales,
 * Documents & Note, Payments, Opal Points, Activities — as in the old Opal POS
 * screen. Everything is derived from the demo ledger (see ledger.ts).
 */

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

import { CustomerSalesTab } from "@/components/contacts/customer-sales-tab";
import { TABS, type TabKey } from "@/components/contacts/customer-tabs";
import {
  DEMO_BUSINESS,
  type DemoCustomer,
} from "@/components/contacts/customers-data";
import {
  LOCATIONS,
  buildLedger,
  invoices,
  type Invoice,
  type LedgerEntry,
} from "@/components/contacts/ledger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
// UTC so the server and the browser print the same values
const DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const DATE_TIME = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});
const asDate = (iso: string) => new Date(iso.length <= 10 ? `${iso}T00:00Z` : `${iso}Z`);
const day = (iso: string) => DATE.format(asDate(iso));
const dayTime = (iso: string) => DATE_TIME.format(asDate(iso));

/** Running balance as the old ledger shows it: "12.50 DR", "4.00 CR", "0.00". */
function drCr(value: number) {
  const amount = Math.abs(value).toFixed(2);
  if (Math.abs(value) < 0.005) return "0.00";
  return `${amount} ${value > 0 ? "DR" : "CR"}`;
}

const STATUS_TONE = { Paid: "green", Partial: "amber", Due: "rose" } as const;

export function CustomerView({
  customer,
  contacts,
  initialTab,
}: {
  customer: DemoCustomer;
  /** For the contact switcher. */
  contacts: { id: number; name: string; contactId: string }[];
  initialTab: TabKey;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>(initialTab);
  const ledger = useMemo(() => buildLedger(customer), [customer]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">View contact</h1>
          <p className="mt-1 text-[13px] text-muted">
            Ledger, sales and payments for this customer.
          </p>
        </div>

        <label className="relative w-full sm:w-72">
          <span className="sr-only">Switch contact</span>
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          />
          <select
            value={customer.id}
            onChange={(event) => router.push(`/contacts/customers/${event.target.value}`)}
            className="w-full appearance-none rounded-lg border border-line bg-background py-2 pl-9 pr-9 text-[13px] outline-none focus:border-brand-500"
          >
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.contactId})
              </option>
            ))}
          </select>
          <Icon
            name="chevron-down"
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          />
        </label>
      </div>

      <ProfileCard customer={customer} />

      <section className="rounded-xl border border-line bg-background shadow-sm shadow-navy-950/[0.03]">
        <div role="tablist" className="scrollbar-none flex overflow-x-auto border-b border-line px-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "relative flex shrink-0 items-center gap-2 px-4 py-3.5 text-[13px] transition-colors",
                tab === t.key
                  ? "font-medium text-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              <Icon name={t.icon} className="h-4 w-4" />
              {t.label}
              {tab === t.key && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand-500" />
              )}
            </button>
          ))}
        </div>

        <div role="tabpanel" className="p-5">
          {tab === "ledger" && <LedgerTab customer={customer} ledger={ledger} />}
          {tab === "sales" && <CustomerSalesTab customer={customer} ledger={ledger} />}
          {tab === "documents" && <DocumentsTab />}
          {tab === "payments" && <PaymentsTab ledger={ledger} />}
          {tab === "points" && <PointsTab customer={customer} ledger={ledger} />}
          {tab === "activities" && <ActivitiesTab customer={customer} ledger={ledger} />}
        </div>
      </section>
    </div>
  );
}

function ProfileCard({ customer }: { customer: DemoCustomer }) {
  return (
    <section className="rounded-xl border border-line bg-background p-5 shadow-sm shadow-navy-950/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-lg font-semibold text-white">
            {customer.name
              .split(/[\s-]+/)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase())
              .join("")}
          </span>
          <div>
            <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight">
              {customer.name}
              <Badge tone="blue">Customer</Badge>
              {customer.group && <Badge>{customer.group}</Badge>}
              {!customer.active && <Badge tone="rose">Inactive</Badge>}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-muted">{customer.contactId}</p>
          </div>
        </div>

        {/* discount dialog isn't built yet */}
        <Button type="button" variant="secondary" size="sm">
          <Icon name="tag" className="h-4 w-4" />
          Add discount
        </Button>
      </div>

      <dl className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <Detail icon="store" label="Address" value={customer.address} />
        <Detail icon="phone" label="Mobile" value={customer.mobile} />
        <Detail icon="mail" label="Email" value={customer.email} />
        <Detail icon="calendar" label="Date of birth" value={customer.dob && day(customer.dob)} />
      </dl>
    </section>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-muted">
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className={cn("mt-0.5 truncate text-[13px]", !value && "text-muted")}>
          {value || "Not set"}
        </dd>
      </div>
    </div>
  );
}

// ---------- Ledger ----------

function LedgerTab({ customer, ledger }: { customer: DemoCustomer; ledger: LedgerEntry[] }) {
  const year = ledger[0].date.slice(0, 4);
  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(`${year}-12-31`);
  const [format, setFormat] = useState<1 | 2>(1);
  const [location, setLocation] = useState("");

  const entries = ledger.filter(
    (e) =>
      e.date.slice(0, 10) >= from &&
      e.date.slice(0, 10) <= to &&
      (!location || e.location === null || e.location === location),
  );

  const opening = entries.filter((e) => e.type === "Opening Balance").reduce((t, e) => t + e.debit, 0);
  // as in the old ledger, sell returns count against the invoice total
  const totalInvoice =
    entries.filter((e) => e.type === "Sell").reduce((t, e) => t + e.debit, 0) -
    entries.filter((e) => e.type === "Sell Return").reduce((t, e) => t + e.credit, 0);
  const totalPaid = entries.filter((e) => e.type === "Payment").reduce((t, e) => t + e.credit, 0);
  const balanceDue = opening + totalInvoice - totalPaid;

  // running balance: each row adds its debit and subtracts its credit
  const rows = entries.reduce<(LedgerEntry & { balance: number })[]>((acc, e) => {
    const previous = acc.at(-1)?.balance ?? 0;
    return [...acc, { ...e, balance: previous + e.debit - e.credit }];
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {/* controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Date range</span>
          <div className="flex items-center gap-2">
            <DateInput label="From" value={from} onChange={setFrom} />
            <span className="text-muted">-</span>
            <DateInput label="To" value={to} onChange={setTo} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Ledger format</span>
          <div className="inline-flex rounded-lg border border-line bg-surface p-0.5">
            {([1, 2] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={format === f}
                onClick={() => setFormat(f)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[12.5px] transition-colors",
                  format === f
                    ? "bg-background font-medium text-foreground shadow-sm"
                    : "text-muted hover:text-foreground",
                )}
              >
                Format {f}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Business location</span>
          <span className="relative">
            <select
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="w-48 appearance-none rounded-lg border border-line bg-background px-3 py-2 pr-9 text-[13px] outline-none focus:border-brand-500"
            >
              <option value="">All locations</option>
              {LOCATIONS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
            <Icon
              name="chevron-down"
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            />
          </span>
        </label>

        <div className="ml-auto flex gap-1.5">
          <IconButton icon="printer" label="Print ledger" onClick={() => window.print()} />
          {/* email sending needs the backend */}
          <IconButton icon="mail" label="Email ledger" />
        </div>
      </div>

      {/* statement header: to / from / account summary */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr_1.2fr]">
        <div className="rounded-lg border border-line p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">To</p>
          <p className="mt-2 text-[13px] font-semibold">{customer.name}</p>
          {customer.address && <p className="text-[13px] text-muted">{customer.address}</p>}
          {customer.mobile && <p className="text-[13px] text-muted">Mobile: {customer.mobile}</p>}
        </div>
        <div className="rounded-lg border border-line p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">From</p>
          <p className="mt-2 text-[13px] font-semibold">{DEMO_BUSINESS.name}</p>
          {DEMO_BUSINESS.lines.map((line) => (
            <p key={line} className="text-[13px] text-muted">
              {line}
            </p>
          ))}
        </div>
        <div className="overflow-hidden rounded-lg border border-line">
          <div className="flex items-baseline justify-between gap-3 bg-surface px-4 py-2.5">
            <p className="text-[13px] font-semibold">Account summary</p>
            <p className="text-xs text-muted">
              {day(from)} - {day(to)}
            </p>
          </div>
          <dl className="divide-y divide-line px-4 text-[13px]">
            <SummaryRow label="Opening balance" value={opening} />
            <SummaryRow label="Total invoice" value={totalInvoice} />
            <SummaryRow label="Total paid" value={totalPaid} />
            <SummaryRow label="Advance balance" value={customer.advanceBalance} />
            <SummaryRow label="Balance due" value={balanceDue} strong />
          </dl>
        </div>
      </div>

      <p className="text-center text-xs text-muted">
        Showing all invoices and payments between {day(from)} and {day(to)}
      </p>

      {format === 1 ? (
        <TableShell
          minWidth={1100}
          head={["Date", "Reference no", "Type", "Location", "Payment status", "Debit", "Credit", "Balance", "Payment method", "Others"]}
          right={[5, 6, 7]}
          empty={rows.length === 0 ? "No entries in this date range." : undefined}
        >
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-line last:border-0 hover:bg-surface">
              <Td muted>{dayTime(row.date)}</Td>
              <Td mono>{row.ref}</Td>
              <Td>
                <span
                  className={cn(
                    row.type === "Payment" && "text-emerald-700 dark:text-emerald-300",
                    row.type === "Sell Return" && "text-rose-600",
                    row.type === "Opening Balance" && "text-muted",
                  )}
                >
                  {row.type}
                </span>
              </Td>
              <Td muted>{row.location}</Td>
              <Td>
                {row.paymentStatus && (
                  <Badge tone={STATUS_TONE[row.paymentStatus]}>{row.paymentStatus}</Badge>
                )}
              </Td>
              <Td right>{row.debit > 0 && USD.format(row.debit)}</Td>
              <Td right>{row.credit > 0 && USD.format(row.credit)}</Td>
              <Td right strong>{drCr(row.balance)}</Td>
              <Td muted>{row.method}</Td>
              <Td muted>{row.forInvoice && `Payment for ${row.forInvoice}`}</Td>
            </tr>
          ))}
        </TableShell>
      ) : (
        <InvoiceTable list={invoices(entries)} />
      )}
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-4 py-2", strong && "font-semibold")}>
      <dt className={strong ? "text-foreground" : "text-muted"}>{label}</dt>
      <dd className={cn("tabular-nums", strong && value > 0 && "text-rose-600")}>
        {USD.format(value)}
      </dd>
    </div>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="date"
      aria-label={label}
      value={value}
      onChange={(event) => event.target.value && onChange(event.target.value)}
      className="rounded-lg border border-line bg-background px-3 py-1.5 text-[13px] outline-none focus:border-brand-500"
    />
  );
}

function IconButton({ icon, label, onClick }: { icon: IconName; label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rounded-lg border border-line p-2 text-muted transition-colors hover:bg-surface hover:text-foreground"
    >
      <Icon name={icon} className="h-4 w-4" />
    </button>
  );
}

// ---------- Sales / Payments ----------

function InvoiceTable({ list }: { list: Invoice[] }) {
  return (
    <TableShell
      minWidth={760}
      head={["Date", "Invoice no", "Location", "Payment status", "Total", "Paid", "Due"]}
      right={[4, 5, 6]}
      empty={list.length === 0 ? "No sales yet." : undefined}
    >
      {list.map((inv) => (
        <tr key={inv.ref} className="border-b border-line last:border-0 hover:bg-surface">
          <Td muted>{dayTime(inv.date)}</Td>
          <Td mono>{inv.ref}</Td>
          <Td muted>{inv.location}</Td>
          <Td>
            <Badge tone={STATUS_TONE[inv.status]}>{inv.status}</Badge>
          </Td>
          <Td right>{USD.format(inv.total)}</Td>
          <Td right>{USD.format(inv.paid)}</Td>
          <Td right strong>
            <span className={cn(inv.total - inv.paid > 0.004 ? "text-rose-600" : "text-muted")}>
              {USD.format(Math.max(0, inv.total - inv.paid))}
            </span>
          </Td>
        </tr>
      ))}
    </TableShell>
  );
}

function PaymentsTab({ ledger }: { ledger: LedgerEntry[] }) {
  const payments = ledger.filter((e) => e.type === "Payment").reverse();

  return (
    <TableShell
      minWidth={700}
      head={["Date", "Reference no", "Amount", "Method", "For invoice", "Location"]}
      right={[2]}
      empty={payments.length === 0 ? "No payments yet." : undefined}
    >
      {payments.map((p) => (
        <tr key={p.id} className="border-b border-line last:border-0 hover:bg-surface">
          <Td muted>{dayTime(p.date)}</Td>
          <Td mono>{p.ref}</Td>
          <Td right strong>
            {USD.format(p.credit)}
          </Td>
          <Td>
            <Badge tone={p.method === "Cash" ? "green" : "blue"}>{p.method}</Badge>
          </Td>
          <Td mono>{p.forInvoice}</Td>
          <Td muted>{p.location}</Td>
        </tr>
      ))}
    </TableShell>
  );
}

// ---------- Documents & Note ----------

function DocumentsTab() {
  // notes live only in this tab's state until the notes endpoint exists
  const [notes, setNotes] = useState<{ text: string; at: string }[]>([]);
  const [draft, setDraft] = useState("");

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">Add a note</span>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            placeholder="e.g. Prefers delivery after 5 pm"
            className="resize-y rounded-lg border border-line bg-background px-3 py-2 text-[13px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
          />
        </label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="brand"
            size="sm"
            disabled={!draft.trim()}
            onClick={() => {
              setNotes((prev) => [{ text: draft.trim(), at: new Date().toISOString() }, ...prev]);
              setDraft("");
            }}
          >
            Save note
          </Button>
          {/* uploads need the backend */}
          <Button type="button" variant="secondary" size="sm">
            <Icon name="download" className="h-4 w-4 rotate-180" />
            Upload document
          </Button>
        </div>
      </div>

      <div>
        {notes.length === 0 ? (
          <EmptyState icon="contact" title="No documents or notes yet" text="Notes you save appear here." />
        ) : (
          <ul className="flex flex-col gap-2">
            {notes.map((note) => (
              <li key={note.at} className="rounded-lg border border-line p-3 text-[13px]">
                <p className="whitespace-pre-wrap">{note.text}</p>
                <p className="mt-1.5 text-xs text-muted">Added just now</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------- Opal Points ----------

function PointsTab({ customer, ledger }: { customer: DemoCustomer; ledger: LedgerEntry[] }) {
  const sales = invoices(ledger).reverse();

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="Points balance" value={String(customer.opalPoints)} tone="plum" />
        <MiniStat label="Earning rule" value="1 point / $10" />
        <MiniStat label="Points value" value={USD.format(customer.opalPoints * 0.01)} />
      </div>
      <TableShell
        minWidth={560}
        head={["Date", "Invoice no", "Sale total", "Points earned"]}
        right={[2, 3]}
        empty={sales.length === 0 ? "No sales, so no points earned yet." : undefined}
      >
        {sales.map((s) => (
          <tr key={s.ref} className="border-b border-line last:border-0 hover:bg-surface">
            <Td muted>{day(s.date)}</Td>
            <Td mono>{s.ref}</Td>
            <Td right>{USD.format(s.total)}</Td>
            <Td right strong>
              <span className="text-plum-600">+{Math.floor(s.total / 10)}</span>
            </Td>
          </tr>
        ))}
      </TableShell>
    </div>
  );
}

// ---------- Activities ----------

function ActivitiesTab({ customer, ledger }: { customer: DemoCustomer; ledger: LedgerEntry[] }) {
  const events = [
    ...ledger
      .filter((e) => e.type !== "Opening Balance")
      .map((e) => ({
        at: e.date,
        icon: (e.type === "Sell" ? "tag" : e.type === "Sell Return" ? "refund" : "dollar") as IconName,
        text:
          e.type === "Sell"
            ? `Sale ${e.ref} for ${USD.format(e.debit)} at ${e.location}`
            : e.type === "Sell Return"
              ? `Sell return ${e.ref} of ${USD.format(e.credit)} at ${e.location} (refund due)`
              : `Payment of ${USD.format(e.credit)} (${e.method}) for ${e.forInvoice}`,
      })),
    { at: `${customer.addedOn}T09:00`, icon: "plus" as IconName, text: "Contact created" },
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <ol className="relative ml-3 border-l border-line">
      {events.map((event, i) => (
        <li key={i} className="relative pb-5 pl-6 last:pb-0">
          <span className="absolute -left-[13px] flex h-6 w-6 items-center justify-center rounded-full border border-line bg-background text-muted">
            <Icon name={event.icon} className="h-3.5 w-3.5" />
          </span>
          <p className="text-[13px]">{event.text}</p>
          <p className="mt-0.5 text-xs text-muted">{dayTime(event.at)}</p>
        </li>
      ))}
    </ol>
  );
}

// ---------- small pieces ----------

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "rose" | "plum" }) {
  return (
    <div className="rounded-lg border border-line px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-lg font-semibold tabular-nums",
          tone === "rose" && "text-rose-600",
          tone === "plum" && "text-plum-600",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-line px-4 py-10 text-center">
      <Icon name={icon} className="h-6 w-6 text-muted" />
      <p className="mt-2 text-[13px] font-medium">{title}</p>
      <p className="mt-0.5 text-xs text-muted">{text}</p>
    </div>
  );
}

function TableShell({
  head,
  right = [],
  minWidth,
  empty,
  children,
}: {
  head: string[];
  /** Indexes of right-aligned (number) columns. */
  right?: number[];
  minWidth: number;
  empty?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-left text-[13px]" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-line bg-surface text-xs text-muted">
            {head.map((h, i) => (
              <th
                key={h}
                scope="col"
                className={cn("whitespace-nowrap px-4 py-2.5 font-medium", right.includes(i) && "text-right")}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
          {empty && (
            <tr>
              <td colSpan={head.length} className="px-4 py-10 text-center text-muted">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Td({
  children,
  right,
  muted,
  mono,
  strong,
}: {
  children?: ReactNode;
  right?: boolean;
  muted?: boolean;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <td
      className={cn(
        "whitespace-nowrap px-4 py-2.5",
        right && "text-right tabular-nums",
        muted && "text-muted",
        mono && "font-mono text-xs",
        strong && "font-medium",
      )}
    >
      {children}
    </td>
  );
}
