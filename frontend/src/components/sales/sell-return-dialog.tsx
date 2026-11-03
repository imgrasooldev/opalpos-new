"use client";

/**
 * "Sell return" from All sales: how many of each product the customer
 * brought back (at most what was sold, less earlier returns), at the price
 * they paid, plus an optional refund right away. Whatever isn't refunded
 * shows as "Sell return due" on the sale.
 *
 * With `initial` it edits that return: its own quantities don't count against
 * the limit, and refunds already made are kept (more go through Add payment).
 */

import { useState } from "react";

import { nowLocal } from "@/components/purchases/payment-dialog";
import {
  SALE_PAYMENT_METHODS,
  netUnitPrice,
  returnedQty,
  sellReturnTotals,
  type Sale,
  type SellReturn,
  type SellReturnLine,
} from "@/components/sales/sales-data";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const num = (v: string) => Number(v) || 0;
const fieldClass =
  "w-full rounded-lg border border-line bg-background px-3 py-2 text-[13px] outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25";

export function SellReturnDialog({
  sale,
  customerName,
  returns,
  initial,
  onClose,
  onSave,
}: {
  sale: Sale;
  customerName: string;
  returns: SellReturn[];
  initial?: SellReturn;
  onClose: () => void;
  onSave: (values: Pick<SellReturn, "date" | "lines" | "tax" | "refunds">) => void;
}) {
  const others = returns.filter((r) => r.id !== initial?.id);
  const rows = sale.lines.map((l) => ({ line: l, max: l.qty - returnedQty(others, sale.id, l.sku) }));
  const [qty, setQty] = useState<Record<string, string>>(() =>
    Object.fromEntries((initial?.lines ?? []).map((l) => [l.sku, String(l.qty)])),
  );
  const [date, setDate] = useState(() => initial?.date ?? nowLocal());
  const [refund, setRefund] = useState("");
  const [method, setMethod] = useState("Cash");
  const [error, setError] = useState("");

  const lines: SellReturnLine[] = rows
    .filter((r) => num(qty[r.line.sku] ?? "") > 0)
    .map((r) => ({
      productId: r.line.productId,
      sku: r.line.sku,
      name: r.line.name,
      qty: num(qty[r.line.sku]),
      unitPrice: netUnitPrice(r.line),
    }));
  const t = sellReturnTotals({ lines, tax: sale.orderTax, refunds: [] });

  function save() {
    if (lines.length === 0) return setError("Enter a quantity for at least one product");
    const over = rows.find((r) => num(qty[r.line.sku] ?? "") > r.max + 0.0001);
    if (over) return setError(`${over.line.name}: only ${over.max.toFixed(2)} can be returned`);
    const refunded = initial ? sellReturnTotals(initial).refunded : 0;
    if (refunded > t.total + 0.004)
      return setError(`${USD.format(refunded)} is already refunded, more than the new total ${USD.format(t.total)}`);
    if (num(refund) > t.total - refunded + 0.004)
      return setError(`The refund can't be more than ${USD.format(t.total - refunded)}`);
    onSave({
      date,
      lines,
      tax: sale.orderTax,
      refunds: [
        ...(initial?.refunds ?? []),
        ...(num(refund) > 0 ? [{ amount: num(refund), method, date, note: "Refund" }] : []),
      ],
    });
  }

  return (
    <Modal
      title={initial ? `Edit sell return ${initial.ref}` : "Sell return"}
      description={`Invoice ${sale.invoiceNo} · ${customerName}`}
      onClose={onClose}
      className="max-w-2xl"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="brand" onClick={save}>
            {initial ? "Update return" : "Save return"}
          </Button>
        </>
      }
    >
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface text-xs text-muted">
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 text-right font-medium">Sold</th>
              <th className="px-3 py-2 text-right font-medium">Price paid</th>
              <th className="px-3 py-2 font-medium">Return quantity</th>
              <th className="px-3 py-2 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ line, max }) => {
              const value = qty[line.sku] ?? "";
              const over = num(value) > max + 0.0001;
              return (
                <tr key={line.sku} className="border-b border-line last:border-0">
                  <td className="px-3 py-2">
                    <p className="font-medium">{line.name}</p>
                    <p className="text-xs text-muted">
                      {max < line.qty ? `${(line.qty - max).toFixed(2)} already returned` : <span className="font-mono">{line.sku}</span>}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{line.qty.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{USD.format(netUnitPrice(line))}</td>
                  <td className="px-3 py-2">
                    <input
                      aria-label={`Return quantity of ${line.name}`}
                      value={value}
                      disabled={max <= 0}
                      placeholder={max <= 0 ? "All returned" : `Up to ${max}`}
                      onChange={(event) => {
                        setQty((prev) => ({ ...prev, [line.sku]: event.target.value.replace(/[^\d.]/g, "") }));
                        setError("");
                      }}
                      inputMode="decimal"
                      className={cn(fieldClass, "w-32 py-1.5 disabled:bg-surface", over && "border-red-500")}
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{USD.format(num(value) * netUnitPrice(line))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto mt-4 grid w-64 grid-cols-2 gap-y-1 text-[13px]">
        <dt className="text-muted">Net:</dt>
        <dd className="text-right tabular-nums">{USD.format(t.net)}</dd>
        <dt className="text-muted">Tax{sale.orderTax ? ` (${sale.orderTax})` : ""}:</dt>
        <dd className="text-right tabular-nums">(+) {USD.format(t.tax)}</dd>
        <dt className="font-semibold">Return total:</dt>
        <dd className="text-right font-semibold tabular-nums">{USD.format(t.total)}</dd>
      </dl>

      <div className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Return date *</span>
          <input type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} className={cn(fieldClass, "px-2")} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Refund now</span>
          <input
            aria-label="Refund amount"
            value={refund}
            placeholder="0.00"
            onChange={(event) => {
              setRefund(event.target.value.replace(/[^\d.]/g, ""));
              setError("");
            }}
            inputMode="decimal"
            className={fieldClass}
          />
          <button type="button" onClick={() => setRefund(t.total.toFixed(2))} className="self-start text-xs font-medium text-brand-500 hover:text-brand-600">
            Refund the full {USD.format(t.total)}
          </button>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Refund method</span>
          <select value={method} onChange={(event) => setMethod(event.target.value)} className={fieldClass}>
            {SALE_PAYMENT_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
      {!error && t.total > 0 && (
        <p className="mt-3 text-xs text-muted">
          Not refunded now: <b className="tabular-nums">{USD.format(Math.max(0, t.total - num(refund)))}</b> shows as sell return due.
        </p>
      )}
    </Modal>
  );
}
