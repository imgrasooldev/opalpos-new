"use client";

/**
 * Expenses -> List expenses, as in the old Opal POS: filters (business
 * location, expense for, contact, expense category, sub category, date range,
 * payment status) above the table, with a totals row.
 *
 * Row actions: Edit, View payments, Add payment and Delete. Refunds count
 * as negative in the totals.
 */

import Link from "next/link";
import { useMemo, useState } from "react";

import { useCustomers } from "@/components/contacts/customer-store";
import { DEMO_BUSINESS } from "@/components/contacts/customers-data";
import {
  expenseStatus,
  expenseTotals,
  nextExpensePaymentRef,
  recurringText,
  signedTotal,
  updateExpenses,
  useExpenseCategories,
  useExpenses,
  type Expense,
  type ExpensePaymentStatus,
} from "@/components/expenses/expenses-data";
import { PRODUCT_LOCATIONS } from "@/components/inventory/products-data";
import { PaymentDialog } from "@/components/purchases/payment-dialog";
import { useSuppliers } from "@/components/purchases/purchases-data";
import { DEMO_USERS } from "@/components/users/users-data";
import { ActionsMenu } from "@/components/ui/actions-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const STATUS_TONE: Record<ExpensePaymentStatus, "green" | "amber" | "rose"> = { Paid: "green", Partial: "amber", Due: "rose" };

type Filters = {
  location: string;
  expenseFor: string;
  contact: string;
  category: string;
  subCategory: string;
  from: string;
  to: string;
  payment: string;
};

// the old screen opens on the current year
const YEAR = new Date().getFullYear();
const DEFAULT_FILTERS: Filters = {
  location: "",
  expenseFor: "",
  contact: "",
  category: "",
  subCategory: "",
  from: `${YEAR}-01-01`,
  to: `${YEAR}-12-31`,
  payment: "",
};

export function ExpensesScreen() {
  const expenses = useExpenses();
  const categories = useExpenseCategories();
  const customers = useCustomers();
  const suppliers = useSuppliers();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [viewing, setViewing] = useState<number | null>(null);
  const [paying, setPaying] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);

  const parents = categories.filter((c) => c.parentId === null);
  const subs = categories.filter((c) => c.parentId !== null && (!filters.category || c.parentId === Number(filters.category)));
  const categoryName = (id: number | null) => categories.find((c) => c.id === id)?.name ?? "";
  const userName = (id: number | null) => DEMO_USERS.find((u) => u.id === id)?.name ?? "";
  const contactName = (e: Expense) =>
    !e.contact
      ? ""
      : e.contact.kind === "customer"
        ? (customers.find((c) => c.id === e.contact?.id)?.name ?? "")
        : (suppliers.find((s) => s.id === e.contact?.id)?.name ?? "");
  const active = Object.entries(filters).filter(([k, v]) => v !== DEFAULT_FILTERS[k as keyof Filters]).length;

  const rows = useMemo(
    () =>
      expenses.filter(
        (e) =>
          (!filters.location || e.location === filters.location) &&
          (!filters.expenseFor || e.expenseFor === Number(filters.expenseFor)) &&
          (!filters.contact || (e.contact && `${e.contact.kind}:${e.contact.id}` === filters.contact)) &&
          (!filters.category || e.categoryId === Number(filters.category)) &&
          (!filters.subCategory || e.subCategoryId === Number(filters.subCategory)) &&
          (!filters.from || e.date.slice(0, 10) >= filters.from) &&
          (!filters.to || e.date.slice(0, 10) <= filters.to) &&
          (!filters.payment || expenseStatus(e) === filters.payment),
      ),
    [expenses, filters],
  );

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    // a new category clears a sub category that belongs to another one
    setFilters((prev) => ({ ...prev, [key]: value, ...(key === "category" ? { subCategory: "" } : {}) }));
  }

  const dash = <span className="text-muted">—</span>;
  const columns: DataColumn<Expense>[] = [
    {
      key: "date",
      label: "Date",
      sortValue: (e) => e.date,
      text: (e) => `${day(e.date)} ${time(e.date)}`,
      render: (e) => (
        <span className="leading-tight">
          <span className="block whitespace-nowrap">{day(e.date)}</span>
          <span className="block text-xs text-muted">{time(e.date)}</span>
        </span>
      ),
    },
    {
      key: "ref",
      label: "Reference no",
      sortValue: (e) => e.ref,
      text: (e) => e.ref,
      render: (e) => <span className="font-mono text-[12.5px] font-medium">{e.ref}</span>,
    },
    {
      key: "recurring",
      label: "Recurring details",
      sortValue: (e) => recurringText(e.recurring),
      text: (e) => recurringText(e.recurring),
      render: (e) =>
        e.recurring ? (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Icon name="calendar" className="h-3.5 w-3.5 text-brand-500" />
            {recurringText(e.recurring)}
          </span>
        ) : (
          dash
        ),
    },
    { key: "category", label: "Expense category", sortValue: (e) => categoryName(e.categoryId), text: (e) => categoryName(e.categoryId), render: (e) => categoryName(e.categoryId) || dash },
    { key: "sub", label: "Sub category", sortValue: (e) => categoryName(e.subCategoryId), text: (e) => categoryName(e.subCategoryId), render: (e) => categoryName(e.subCategoryId) || dash },
    { key: "location", label: "Location", sortValue: (e) => e.location, text: (e) => e.location },
    {
      key: "payment",
      label: "Payment status",
      sortValue: expenseStatus,
      text: expenseStatus,
      render: (e) => (
        <button type="button" onClick={() => setViewing(e.id)} title="View payments">
          <Badge tone={STATUS_TONE[expenseStatus(e)]}>{expenseStatus(e)}</Badge>
        </button>
      ),
      total: (list) => (
        <span className="text-[12px] font-normal">
          Due: <b className="tabular-nums">{USD.format(list.reduce((s, e) => s + expenseTotals(e).due, 0))}</b>
        </span>
      ),
    },
    { key: "tax", label: "Tax", sortValue: (e) => e.tax ?? "", text: (e) => e.tax ?? "", render: (e) => e.tax ?? dash },
    {
      key: "total",
      label: "Total amount",
      sortValue: signedTotal,
      text: (e) => signedTotal(e).toFixed(2),
      render: (e) =>
        e.isRefund ? (
          <span className="flex flex-col items-end leading-tight">
            <span className="font-medium tabular-nums text-emerald-600">-{USD.format(e.total)}</span>
            <span className="text-[11px] text-muted">Refund</span>
          </span>
        ) : (
          <span className="font-medium tabular-nums">{USD.format(e.total)}</span>
        ),
      align: "right",
      total: (list) => <span className="tabular-nums">{USD.format(list.reduce((s, e) => s + signedTotal(e), 0))}</span>,
    },
    { key: "for", label: "Expense for", sortValue: (e) => userName(e.expenseFor), text: (e) => userName(e.expenseFor), render: (e) => userName(e.expenseFor) || dash },
    { key: "contact", label: "Contact", sortValue: contactName, text: contactName, render: (e) => contactName(e) || dash },
    {
      key: "note",
      label: "Expense note",
      sortValue: (e) => e.note,
      text: (e) => e.note,
      render: (e) => (e.note ? <span className="block max-w-56 truncate" title={e.note}>{e.note}</span> : dash),
    },
    { key: "addedBy", label: "Added by", sortValue: (e) => e.addedBy, text: (e) => e.addedBy },
  ];

  const viewed = expenses.find((e) => e.id === viewing);
  const paid = expenses.find((e) => e.id === paying);

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
        bodyClassName="border-t border-line pt-4"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FilterSelect
            label="Business location"
            value={filters.location}
            onChange={(v) => set("location", v)}
            options={[{ value: "", label: "All locations" }, ...PRODUCT_LOCATIONS.map((l) => ({ value: l, label: l }))]}
          />
          <FilterSelect
            label="Expense for"
            value={filters.expenseFor}
            onChange={(v) => set("expenseFor", v)}
            options={[{ value: "", label: "All" }, ...DEMO_USERS.map((u) => ({ value: String(u.id), label: u.name }))]}
          />
          <FilterSelect
            label="Contact"
            value={filters.contact}
            onChange={(v) => set("contact", v)}
            options={[
              { value: "", label: "All" },
              ...customers.map((c) => ({ value: `customer:${c.id}`, label: `${c.name} (Customer)` })),
              ...suppliers.map((s) => ({ value: `supplier:${s.id}`, label: `${s.name} (Supplier)` })),
            ]}
          />
          <FilterSelect
            label="Expense category"
            value={filters.category}
            onChange={(v) => set("category", v)}
            options={[{ value: "", label: "All" }, ...parents.map((c) => ({ value: String(c.id), label: c.name }))]}
          />
          <FilterSelect
            label="Sub category"
            value={filters.subCategory}
            onChange={(v) => set("subCategory", v)}
            options={[{ value: "", label: "All" }, ...subs.map((c) => ({ value: String(c.id), label: c.name }))]}
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
          <FilterSelect
            label="Payment status"
            value={filters.payment}
            onChange={(v) => set("payment", v)}
            options={[{ value: "", label: "All" }, ...["Paid", "Due", "Partial"].map((s) => ({ value: s, label: s }))]}
          />
        </div>
      </Card>

      <DataTable
        title="All expenses"
        subtitle={active > 0 ? `${rows.length} of ${expenses.length} expenses match the filters` : `${rows.length} expenses this year`}
        rows={rows}
        columns={columns}
        rowKey={(e) => e.id}
        defaultSort={{ key: "date", direction: "desc" }}
        defaultPageSize={100}
        noun="expenses"
        exportName="expenses"
        minWidth={1400}
        actionsPosition="start"
        headerAction={
          <Link
            href="/expenses/create"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            <Icon name="plus" className="h-4 w-4" />
            Add
          </Link>
        }
        actions={(e) => (
          <ActionsMenu
            label={`Actions for ${e.ref}`}
            actions={[
              { label: "Edit", icon: "pencil", href: `/expenses/${e.id}/edit` },
              { label: "View payments", icon: "eye", onClick: () => setViewing(e.id) },
              ...(expenseTotals(e).due > 0 ? [{ label: "Add payment", icon: "dollar" as const, onClick: () => setPaying(e.id) }] : []),
              {
                label: "Delete",
                icon: "trash",
                danger: true,
                dividerBefore: true,
                onClick: () =>
                  setConfirm({
                    tone: "danger",
                    confirmLabel: "Delete",
                    message: `${e.ref} (${USD.format(e.total)}) and its payments will be deleted.`,
                    onConfirm: () => updateExpenses((prev) => prev.filter((x) => x.id !== e.id)),
                  }),
              },
            ]}
          />
        )}
      />

      {viewed && (
        <PaymentsDialog
          expense={viewed}
          category={[categoryName(viewed.categoryId), categoryName(viewed.subCategoryId)].filter(Boolean).join(" / ")}
          contact={contactName(viewed)}
          onAdd={() => setPaying(viewed.id)}
          onDelete={(index) =>
            setConfirm({
              tone: "danger",
              confirmLabel: "Delete",
              message: `Payment ${viewed.payments[index]?.ref ?? index + 1} (${USD.format(viewed.payments[index]?.amount ?? 0)}) will be deleted.`,
              onConfirm: () =>
                updateExpenses((prev) => prev.map((x) => (x.id === viewed.id ? { ...x, payments: x.payments.filter((_, i) => i !== index) } : x))),
            })
          }
          onClose={() => setViewing(null)}
        />
      )}

      {paid && (
        <PaymentDialog
          key={paid.id}
          description={`${paid.ref} · ${categoryName(paid.categoryId) || "Expense"}`}
          total={paid.total}
          paid={expenseTotals(paid).paid}
          info={[
            [
              ["Reference no", paid.ref],
              ["Location", paid.location],
            ],
            [
              ["Total amount", USD.format(paid.total)],
              ["Payment due", USD.format(expenseTotals(paid).due)],
            ],
          ]}
          onClose={() => setPaying(null)}
          onSave={(payment) => {
            updateExpenses((prev) =>
              prev.map((x) => (x.id === paid.id ? { ...x, payments: [...x.payments, { ...payment, ref: nextExpensePaymentRef(prev) }] } : x)),
            );
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

/** "View payments" for an expense: its details, "+ Add payment" and the payments made. */
function PaymentsDialog({
  expense: e,
  category,
  contact,
  onAdd,
  onDelete,
  onClose,
}: {
  expense: Expense;
  category: string;
  contact: string;
  onAdd: () => void;
  onDelete: (index: number) => void;
  onClose: () => void;
}) {
  const t = expenseTotals(e);
  const status = expenseStatus(e);

  return (
    <Modal
      title={`View payments (Reference no: ${e.ref})`}
      onClose={onClose}
      className="max-w-3xl"
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
      <div className="grid gap-4 text-[13px] sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted">Expense</p>
          <p className="font-medium">{category || "No category"}</p>
          {contact && <p className="text-muted">Paid to {contact}</p>}
          {e.note && <p className="text-muted">{e.note}</p>}
        </div>
        <div>
          <p className="text-xs text-muted">Business</p>
          <p className="font-medium">{DEMO_BUSINESS.name}</p>
          <p className="text-muted">{e.location}</p>
        </div>
        <div className="flex flex-col gap-0.5">
          <p>
            <span className="text-muted">Date:</span> <span className="font-medium">{day(e.date)}</span>
          </p>
          <p>
            <span className="text-muted">Payment status:</span> <Badge tone={STATUS_TONE[status]}>{status}</Badge>
          </p>
          <p>
            <span className="text-muted">Due:</span> <span className="font-medium tabular-nums">{USD.format(t.due)}</span> of {USD.format(e.total)}
          </p>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button type="button" variant="brand" size="sm" onClick={onAdd} disabled={t.due <= 0} title={t.due <= 0 ? "Fully paid" : undefined}>
          <Icon name="plus" className="h-4 w-4" />
          Add payment
        </Button>
      </div>

      <div className="mt-2 overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[620px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface text-xs text-muted">
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Reference no</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Payment method</th>
              <th className="px-3 py-2 font-medium">Payment note</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {e.payments.map((p, i) => (
              <tr key={i} className="border-b border-line last:border-0">
                <td className="px-3 py-2">
                  {day(p.date)} <span className="text-muted">{time(p.date)}</span>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{p.ref ?? "—"}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{USD.format(p.amount)}</td>
                <td className="px-3 py-2">{p.method}</td>
                <td className="px-3 py-2 text-muted">{p.note || "—"}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    aria-label={`Delete payment ${p.ref ?? i + 1}`}
                    onClick={() => onDelete(i)}
                    className="rounded-lg p-1.5 text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {e.payments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

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
