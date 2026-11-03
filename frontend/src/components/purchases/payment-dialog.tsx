"use client";

/**
 * "Add payment" popup shared by purchases, purchase returns, sales and sell
 * returns, laid out like the old one: optional info boxes, advance balance,
 * payment method, paid on, amount, cash denominations, document and note.
 * The amount can't go over what's still due.
 */

import { useState, type ReactNode } from "react";

import { PAYMENT_METHODS, type PurchasePayment } from "@/components/purchases/purchases-data";
import { Button } from "@/components/ui/button";
import { CashDenominations, cashTotal } from "@/components/ui/cash-denominations";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const fieldClass =
  "w-full rounded-lg border border-line bg-background px-3 py-2 text-[13px] outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25";

/** "2026-11-03T15:20" in local time — what datetime-local expects. */
export function nowLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

/** One of the old screen's info boxes: label / value rows. */
export type PaymentInfoBox = [label: string, value: ReactNode][];

export function PaymentDialog({
  description,
  total,
  paid,
  info,
  advance,
  onClose,
  onSave,
}: {
  description: string;
  total: number;
  paid: number;
  /** Boxes shown at the top, like the old popup (customer, invoice, total). */
  info?: PaymentInfoBox[];
  /** The contact's advance balance, shown above the fields. */
  advance?: number;
  onClose: () => void;
  onSave: (payment: PurchasePayment) => void;
}) {
  const due = Math.max(0, Math.round((total - paid) * 100) / 100);
  const [amount, setAmount] = useState(due.toFixed(2));
  const [paidOn, setPaidOn] = useState(nowLocal);
  const [method, setMethod] = useState("Cash");
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function save() {
    const n = Number(amount) || 0;
    if (n <= 0) return setError("Enter an amount above zero");
    if (n > due + 0.004) return setError(`Only ${USD.format(due)} is due`);
    if (method === "Cash" && cashTotal(counts) > 0 && Math.abs(cashTotal(counts) - n) > 0.004)
      return setError(`Cash counted (${USD.format(cashTotal(counts))}) doesn't match the amount`);
    onSave({ amount: n, method, date: paidOn, note: note.trim() });
  }

  return (
    <Modal
      title="Add payment"
      description={description}
      onClose={onClose}
      className="max-w-xl"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="brand" onClick={save} disabled={due <= 0}>
            Save
          </Button>
        </>
      }
    >
      {info && (
        <div className="mb-3 grid gap-3 sm:grid-cols-3">
          {info.map((box, i) => (
            <dl key={i} className="rounded-lg border border-line bg-surface px-3.5 py-3 text-[13px]">
              {box.map(([label, value]) => (
                <div key={label}>
                  <dt className="inline font-medium">{label}: </dt>
                  <dd className="inline text-muted">{value}</dd>
                </div>
              ))}
            </dl>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 rounded-lg bg-surface px-4 py-3 text-[13px]">
        <p>
          <span className="block text-xs text-muted">Total</span>
          <span className="font-medium tabular-nums">{USD.format(total)}</span>
        </p>
        <p>
          <span className="block text-xs text-muted">Paid</span>
          <span className="font-medium tabular-nums">{USD.format(paid)}</span>
        </p>
        <p>
          <span className="block text-xs text-muted">Due</span>
          <span className={cn("font-medium tabular-nums", due > 0 ? "text-rose-600" : "text-emerald-600")}>
            {USD.format(due)}
          </span>
        </p>
      </div>

      {due <= 0 ? (
        <p className="mt-4 text-[13px] text-emerald-600">This is fully paid.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {advance !== undefined && (
            <p className="text-[13px]">
              <span className="font-medium">Advance balance:</span> <span className="tabular-nums text-muted">{USD.format(advance)}</span>
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Payment method *</span>
              <span className="relative">
                <select
                  value={method}
                  onChange={(event) => setMethod(event.target.value)}
                  className={cn(fieldClass, "appearance-none pr-9")}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
                <Icon name="chevron-down" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              </span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Paid on *</span>
              <input
                type="datetime-local"
                value={paidOn}
                onChange={(event) => setPaidOn(event.target.value)}
                className={cn(fieldClass, "px-2")}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Amount *</span>
              <input
                aria-label="Amount"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value.replace(/[^\d.]/g, ""));
                  setError("");
                }}
                inputMode="decimal"
                className={cn(fieldClass, error && "border-red-500")}
              />
            </label>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {method === "Cash" && <CashDenominations counts={counts} onChange={setCounts} target={Number(amount) || 0} />}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Attach document</span>
            <input
              type="file"
              accept=".pdf,.csv,.zip,.doc,.docx,.jpeg,.jpg,.png"
              className="text-[13px] text-muted file:mr-3 file:rounded-lg file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-foreground hover:file:bg-background"
            />
            <span className="text-xs text-muted">Allowed: .pdf, .csv, .zip, .doc, .docx, .jpeg, .jpg, .png</span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Payment note</span>
            <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} className={fieldClass} />
          </label>
        </div>
      )}
    </Modal>
  );
}
