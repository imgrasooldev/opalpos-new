"use client";

/**
 * Add / Edit expense, as in the old Opal POS:
 *   - business location, expense category, sub category, reference no,
 *     date, expense for, expense for contact, attach document, applicable
 *     tax, total amount, expense note and "Is refund?"
 *   - "Is recurring?" with the interval and the number of repetitions
 *   - Add payment: amount, paid on, payment method (cash denominations for
 *     cash), payment note and the payment due (Add only; Edit keeps the
 *     payments, which are managed from the list)
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { useCustomers } from "@/components/contacts/customer-store";
import {
  RECUR_UNITS,
  nextExpensePaymentRef,
  nextExpenseRef,
  updateExpenses,
  useExpenseCategories,
  useExpenses,
  type Expense,
  type RecurUnit,
} from "@/components/expenses/expenses-data";
import { LOCATION_CODES, PRODUCT_LOCATIONS, TAXES } from "@/components/inventory/products-data";
import { nowLocal } from "@/components/purchases/payment-dialog";
import { PAYMENT_METHODS, useSuppliers } from "@/components/purchases/purchases-data";
import { DEMO_USERS } from "@/components/users/users-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CashDenominations, cashTotal } from "@/components/ui/cash-denominations";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const num = (v: string) => Number(v) || 0;
const decimal = (v: string) => v.replace(/[^\d.]/g, "");

const HELP = {
  expenseFor: "Choose the user for which the expense is related to (optional). Example: salary of an employee.",
  refund: "If checked, this is money coming back (a returned deposit, an overcharge) and it is taken off the expense totals.",
  recurring: "If checked, this expense will be added again automatically on the interval below.",
};

export function ExpenseForm({ initial }: { initial?: Expense }) {
  const router = useRouter();
  const expenses = useExpenses();
  const categories = useExpenseCategories();
  const customers = useCustomers();
  const suppliers = useSuppliers();
  const editing = Boolean(initial);

  const [location, setLocation] = useState(initial?.location ?? PRODUCT_LOCATIONS[0]);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ? String(initial.categoryId) : "");
  const [subCategoryId, setSubCategoryId] = useState(initial?.subCategoryId ? String(initial.subCategoryId) : "");
  const [ref, setRef] = useState(initial?.ref ?? "");
  const [date, setDate] = useState(initial?.date ?? nowLocal());
  const [expenseFor, setExpenseFor] = useState(initial?.expenseFor ? String(initial.expenseFor) : "");
  const [contact, setContact] = useState(initial?.contact ? `${initial.contact.kind}:${initial.contact.id}` : "");
  const [document, setDocument] = useState<string | null>(initial?.document ?? null);
  const [tax, setTax] = useState(initial?.tax ?? "");
  const [total, setTotal] = useState(initial ? initial.total.toFixed(2) : "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [isRefund, setIsRefund] = useState(initial?.isRefund ?? false);
  const [recurring, setRecurring] = useState(Boolean(initial?.recurring));
  const [every, setEvery] = useState(initial?.recurring ? String(initial.recurring.every) : "");
  const [unit, setUnit] = useState<RecurUnit>(initial?.recurring?.unit ?? "Days");
  const [repetitions, setRepetitions] = useState(initial?.recurring?.repetitions ? String(initial.recurring.repetitions) : "");

  const [amount, setAmount] = useState("0.00");
  const [paidOn, setPaidOn] = useState(nowLocal);
  const [method, setMethod] = useState("Cash");
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [payNote, setPayNote] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const parents = categories.filter((c) => c.parentId === null);
  const subs = categories.filter((c) => categoryId && c.parentId === Number(categoryId));
  const paymentDue = Math.max(0, Math.round((num(total) - num(amount)) * 100) / 100);

  function save() {
    const next: string[] = [];
    if (!location) next.push("Pick the business location");
    if (!date) next.push("Pick the date");
    if (num(total) <= 0) next.push("Enter the total amount");
    if (recurring && num(every) <= 0) next.push("Enter the recurring interval");
    const alreadyPaid = (initial?.payments ?? []).reduce((s, p) => s + p.amount, 0);
    if (editing && num(total) > 0 && num(total) < alreadyPaid - 0.004)
      next.push(`${USD.format(alreadyPaid)} is already paid, so the total can't be lower. Delete payments from the list first.`);
    if (!editing) {
      if (num(amount) > num(total) + 0.004) next.push(`The payment can't be more than the total amount (${USD.format(num(total))})`);
      if (method === "Cash" && num(amount) > 0 && cashTotal(counts) > 0 && Math.abs(cashTotal(counts) - num(amount)) > 0.004)
        next.push(`Cash counted (${USD.format(cashTotal(counts))}) doesn't match the amount`);
    }
    if (ref.trim() && expenses.some((x) => x.ref === ref.trim() && x.id !== initial?.id)) next.push(`${ref.trim()} is already used`);
    setErrors(next);
    if (next.length) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const [kind, contactId] = contact.split(":");
    const expense: Expense = {
      id: initial?.id ?? Math.max(0, ...expenses.map((x) => x.id)) + 1,
      ref: ref.trim() || nextExpenseRef(expenses),
      date,
      location,
      categoryId: categoryId ? Number(categoryId) : null,
      subCategoryId: subCategoryId ? Number(subCategoryId) : null,
      tax: tax || null,
      total: num(total),
      expenseFor: expenseFor ? Number(expenseFor) : null,
      contact: contact ? { kind: kind as "customer" | "supplier", id: Number(contactId) } : null,
      recurring: recurring ? { every: num(every), unit, repetitions: num(repetitions) || null } : null,
      note: note.trim(),
      isRefund,
      document,
      payments:
        initial?.payments ??
        (num(amount) > 0
          ? [{ ref: nextExpensePaymentRef(expenses), amount: num(amount), method, date: paidOn, note: payNote.trim() }]
          : []),
      addedBy: initial?.addedBy ?? "Adnan Ahmed",
    };
    updateExpenses((prev) => (editing ? prev.map((x) => (x.id === expense.id ? expense : x)) : [...prev, expense]));
    router.push("/expenses");
  }

  return (
    <div className="flex flex-col gap-5">
      {errors.length > 0 && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          {errors.join(" · ")}
        </div>
      )}

      <Card bodyClassName="pt-5">
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-3">
          <Field label="Business location *">
            <Select value={location} onChange={setLocation} label="Business location" icon>
              {PRODUCT_LOCATIONS.map((l) => (
                <option key={l} value={l}>
                  {l} ({LOCATION_CODES[l]})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Expense category">
            <Select
              value={categoryId}
              onChange={(v) => {
                setCategoryId(v);
                setSubCategoryId("");
              }}
              label="Expense category"
            >
              <option value="">Please select</option>
              {parents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sub category" hint={categoryId && subs.length === 0 ? "This category has no sub categories." : undefined}>
            <Select value={subCategoryId} onChange={setSubCategoryId} label="Sub category" disabled={subs.length === 0}>
              <option value="">Please select</option>
              {subs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Reference no" hint="Leave empty to autogenerate">
            <input value={ref} onChange={(event) => setRef(event.target.value)} placeholder={nextExpenseRef(expenses)} className={cn(inputClass, "font-mono")} />
          </Field>
          <div className="hidden md:col-span-2 md:block" />

          <Field label="Date *">
            <input type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
          </Field>
          <Field label="Expense for" help={HELP.expenseFor}>
            <Select value={expenseFor} onChange={setExpenseFor} label="Expense for">
              <option value="">None</option>
              {DEMO_USERS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Expense for contact">
            <Select value={contact} onChange={setContact} label="Expense for contact">
              <option value="">Please select</option>
              <optgroup label="Customers">
                {customers.map((c) => (
                  <option key={c.id} value={`customer:${c.id}`}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Suppliers">
                {suppliers.map((s) => (
                  <option key={s.id} value={`supplier:${s.id}`}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            </Select>
          </Field>

          <Field label="Attach document" hint="Max file size: 5MB. Allowed: .pdf, .csv, .zip, .doc, .docx, .jpeg, .jpg, .png">
            <input
              type="file"
              aria-label="Attach document"
              accept=".pdf,.csv,.zip,.doc,.docx,.jpeg,.jpg,.png"
              onChange={(event) => setDocument(event.target.files?.[0]?.name ?? null)}
              className="text-[13px] text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500 file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-white"
            />
            {document && <span className="text-xs text-muted">Attached: {document}</span>}
          </Field>
          <Field label="Applicable tax">
            <Select value={tax} onChange={setTax} label="Applicable tax">
              <option value="">None</option>
              {TAXES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Total amount *" hint={tax ? "Tax included." : undefined}>
            <span className="relative block">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">$</span>
              <input
                aria-label="Total amount"
                value={total}
                onChange={(event) => setTotal(decimal(event.target.value))}
                inputMode="decimal"
                placeholder="Total amount"
                className={cn(inputClass, "pl-7")}
              />
            </span>
          </Field>

          <Field label="Expense note">
            <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} />
          </Field>
          <div className="flex items-start pt-7">
            <Check checked={isRefund} onChange={setIsRefund} label="Is refund?" help={HELP.refund} />
          </div>
        </div>
      </Card>

      <Card bodyClassName="pt-5">
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-3">
          <div className="flex items-start pt-7">
            <Check checked={recurring} onChange={setRecurring} label="Is recurring?" help={HELP.recurring} />
          </div>
          <Field label={`Recurring interval${recurring ? " *" : ""}`}>
            <span className="flex">
              <input
                aria-label="Recurring interval"
                value={every}
                disabled={!recurring}
                onChange={(event) => setEvery(event.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                className={cn(inputClass, "rounded-r-none disabled:bg-surface")}
              />
              <span className="relative w-36 shrink-0">
                <select
                  aria-label="Recurring interval unit"
                  value={unit}
                  disabled={!recurring}
                  onChange={(event) => setUnit(event.target.value as RecurUnit)}
                  className={cn(inputClass, "appearance-none rounded-l-none border-l-0 pr-9 disabled:bg-surface")}
                >
                  {RECUR_UNITS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
                <Icon name="chevron-down" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              </span>
            </span>
          </Field>
          <Field label="No. of repetitions" hint="If blank, the expense will be generated infinite times">
            <input
              aria-label="No. of repetitions"
              value={repetitions}
              disabled={!recurring}
              onChange={(event) => setRepetitions(event.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              className={cn(inputClass, "disabled:bg-surface")}
            />
          </Field>
        </div>
      </Card>

      {!editing && (
        <Card title="Add payment" bodyClassName="border-t border-line pt-4">
          <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
            <Field label="Amount *">
              <span className="relative block">
                <Icon name="dollar" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  aria-label="Payment amount"
                  value={amount}
                  onChange={(event) => setAmount(decimal(event.target.value))}
                  inputMode="decimal"
                  className={cn(inputClass, "pl-9 pr-9")}
                />
                {num(amount) > 0 && (
                  <button
                    type="button"
                    aria-label="Clear amount"
                    onClick={() => setAmount("0.00")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground"
                  >
                    <Icon name="close" className="h-3.5 w-3.5" />
                  </button>
                )}
              </span>
            </Field>
            <Field label="Paid on *">
              <input type="datetime-local" value={paidOn} onChange={(event) => setPaidOn(event.target.value)} className={inputClass} />
            </Field>
            <Field label="Payment method *">
              <Select value={method} onChange={setMethod} label="Payment method">
                {PAYMENT_METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </Field>
            <Field label="Payment note">
              <textarea rows={2} value={payNote} onChange={(event) => setPayNote(event.target.value)} className={inputClass} />
            </Field>
          </div>
          {method === "Cash" && (
            <div className="mt-4">
              <CashDenominations counts={counts} onChange={setCounts} target={num(amount)} />
            </div>
          )}
          <p className="mt-4 border-t border-line pt-4 text-right text-[13px] text-muted">
            Payment due: <span className={cn("text-lg font-semibold tabular-nums", paymentDue > 0 ? "text-rose-600" : "text-foreground")}>{USD.format(paymentDue)}</span>
          </p>
        </Card>
      )}

      <div className="flex justify-end gap-3">
        <Link href="/expenses" className="inline-flex items-center rounded-lg border border-line bg-background px-3.5 py-2 text-sm font-medium transition-colors hover:bg-surface">
          Cancel
        </Link>
        <Button type="button" variant="brand" onClick={save}>
          {editing ? "Update" : "Save"}
        </Button>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900";

function HelpIcon({ text }: { text: string }) {
  return (
    <span title={text} aria-label={text} className="text-brand-500">
      <Icon name="info" className="h-4 w-4" />
    </span>
  );
}

function Field({ label, hint, help, children }: { label: string; hint?: string; help?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {help && <HelpIcon text={help} />}
      </span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Check({ checked, onChange, label, help }: { checked: boolean; onChange: (v: boolean) => void; label: string; help: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-brand-500" />
      {label}
      <HelpIcon text={help} />
    </label>
  );
}

function Select({
  value,
  onChange,
  children,
  label,
  icon,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  label: string;
  icon?: boolean;
  disabled?: boolean;
}) {
  return (
    <span className="relative block w-full">
      {icon && <Icon name="store" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />}
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(inputClass, "appearance-none pr-9 disabled:bg-surface", icon && "pl-10")}
      >
        {children}
      </select>
      <Icon name="chevron-down" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </span>
  );
}
