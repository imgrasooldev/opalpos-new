"use client";

/**
 * "Add payment" modal from the customer Actions menu — same layout as the old
 * Opal POS one: customer and totals at the top, method / paid on / amount,
 * cash denominations (Cash only), attachment and note.
 *
 * Totals come from the demo ledger, so they match the View Contact screen.
 * Saving hands the amount to the parent; nothing is sent to a server yet.
 */

import { useState, type FormEvent } from "react";

import type { DemoCustomer } from "@/components/contacts/customers-data";
import { buildLedger } from "@/components/contacts/ledger";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";

const FORM_ID = "payment-form";
const METHODS = ["Cash", "Card", "Cheque", "Bank transfer", "Other"];
const DENOMINATIONS = [1, 2, 5, 10, 20, 50, 100];
const ACCEPTED = ".pdf,.csv,.zip,.doc,.docx,.jpeg,.jpg,.png";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** "2026-11-02T18:08" in local time — what a datetime-local input expects. */
function nowLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export function PaymentDialog({
  customer,
  onClose,
  onSave,
}: {
  customer: DemoCustomer;
  onClose: () => void;
  onSave: (amount: number) => void;
}) {
  const [ledger] = useState(() => buildLedger(customer));
  const totalSale = ledger.filter((e) => e.type === "Sell").reduce((t, e) => t + e.debit, 0);
  const totalPaid = ledger.filter((e) => e.type === "Payment").reduce((t, e) => t + e.credit, 0);
  const due = Math.max(0, customer.saleDue);

  const [method, setMethod] = useState("Cash");
  const [amount, setAmount] = useState(due ? due.toFixed(2) : "");
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [paidOn] = useState(nowLocal);
  const [error, setError] = useState<string>();

  const cashTotal = DENOMINATIONS.reduce((t, d) => t + d * (Number(counts[d]) || 0), 0);
  const value = Number(amount);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!(value > 0)) return setError("Enter an amount greater than zero");
    // counting notes is optional, but if they're counted they must add up
    if (method === "Cash" && cashTotal > 0 && Math.abs(cashTotal - value) > 0.004)
      return setError(`Cash counted (${USD.format(cashTotal)}) doesn't match the amount`);
    onSave(Math.round(value * 100) / 100);
  }

  return (
    <Modal
      title="Add payment"
      description={`Record a payment from ${customer.name}.`}
      onClose={onClose}
      className="max-w-2xl"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="submit" form={FORM_ID} variant="brand">
            Save
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        noValidate
        onSubmit={handleSubmit}
        onInput={() => error && setError(undefined)}
        className="flex flex-col gap-5"
      >
        {/* who and how much is owed */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface/60 p-4">
            <p className="text-xs text-muted">Customer</p>
            <p className="mt-0.5 text-[15px] font-semibold">{customer.name}</p>
            <p className="font-mono text-xs text-muted">{customer.contactId}</p>
          </div>
          <dl className="rounded-xl border border-line bg-surface/60 p-4 text-[13px]">
            <Total label="Total sale" value={totalSale} />
            <Total label="Total paid" value={totalPaid} />
            <Total label="Total sale due" value={customer.saleDue} strong />
            <Total label="Opening balance" value={customer.openingBalance} />
            <Total label="Opening balance due" value={customer.openingBalance} />
          </dl>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Payment method *</span>
            <span className="relative">
              <Icon
                name="dollar"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              />
              <select
                name="method"
                value={method}
                onChange={(event) => setMethod(event.target.value)}
                className="w-full appearance-none rounded-lg border border-zinc-300 bg-white py-2.5 pl-10 pr-9 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900"
              >
                {METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <Icon
                name="chevron-down"
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              />
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Paid on *</span>
            <input
              type="datetime-local"
              name="paidOn"
              defaultValue={paidOn}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Amount *</span>
            <span className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                $
              </span>
              <input
                name="amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
                placeholder="0.00"
                className={cn(
                  "w-full rounded-lg border bg-white py-2.5 pl-7 pr-3 text-sm tabular-nums outline-none focus:ring-2 dark:bg-navy-900",
                  error
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/25"
                    : "border-zinc-300 focus:border-brand-500 focus:ring-brand-500/25 dark:border-navy-700",
                )}
              />
            </span>
          </label>
        </div>

        {error && (
          <p role="alert" className="-mt-2 text-xs text-red-600">
            {error}
          </p>
        )}

        {/* cash only: count the notes, the total should equal the amount */}
        {method === "Cash" && (
          <div className="overflow-hidden rounded-xl border border-line">
            <div className="flex items-center justify-between gap-3 bg-surface px-4 py-2.5">
              <p className="text-[13px] font-semibold">Cash denominations</p>
              <p className="text-xs text-muted">Optional: count the notes you received</p>
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-y border-line text-xs text-muted">
                  <th scope="col" className="px-4 py-2 text-left font-medium">Denomination</th>
                  <th scope="col" className="px-4 py-2 text-left font-medium">Count</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {DENOMINATIONS.map((d) => (
                  <tr key={d} className="border-b border-line last:border-0">
                    <td className="px-4 py-1.5 tabular-nums">
                      {USD.format(d)} <span className="text-muted">×</span>
                    </td>
                    <td className="px-4 py-1.5">
                      <input
                        aria-label={`Count of ${USD.format(d)}`}
                        inputMode="numeric"
                        value={counts[d] ?? ""}
                        onChange={(event) =>
                          setCounts((prev) => ({ ...prev, [d]: event.target.value.replace(/\D/g, "") }))
                        }
                        placeholder="0"
                        className="w-24 rounded-md border border-line bg-background px-2 py-1 text-[13px] tabular-nums outline-none focus:border-brand-500"
                      />
                    </td>
                    <td className="px-4 py-1.5 text-right tabular-nums text-muted">
                      {USD.format(d * (Number(counts[d]) || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line bg-surface font-semibold">
                  <td className="px-4 py-2" colSpan={2}>
                    Total
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2 text-right tabular-nums",
                      cashTotal > 0 && Math.abs(cashTotal - value) < 0.005 && "text-emerald-600",
                    )}
                  >
                    {USD.format(cashTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Attach document</span>
          <input
            type="file"
            name="document"
            accept={ACCEPTED}
            className="text-[13px] text-muted file:mr-3 file:rounded-lg file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-foreground hover:file:bg-background"
          />
          <span className="text-xs text-muted">Allowed: .pdf, .csv, .zip, .doc, .docx, .jpeg, .jpg, .png</span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Payment note</span>
          <textarea
            name="note"
            rows={3}
            placeholder="e.g. Paid at the counter"
            className="resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900"
          />
        </label>
      </form>
    </Modal>
  );
}

function Total({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-4 py-0.5", strong && "font-semibold")}>
      <dt className={strong ? "" : "text-muted"}>{label}</dt>
      <dd className={cn("tabular-nums", strong && value > 0 && "text-rose-600")}>{USD.format(value)}</dd>
    </div>
  );
}
