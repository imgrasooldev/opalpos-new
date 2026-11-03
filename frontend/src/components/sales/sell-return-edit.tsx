"use client";

/**
 * Edit sell return, laid out like the old Opal POS page: a "Parent sale"
 * card, then invoice no and date, the sold products with what was already
 * returned and a return quantity each, the return discount, and the totals.
 *
 * Saving swaps the old quantities for the new ones in stock and logs an
 * "Edited" activity. Refunds already made stay; more go through Add payment.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { useCustomers } from "@/components/contacts/customer-store";
import { updateProducts, useDemoProducts, useHydrated } from "@/components/inventory/product-store";
import {
  applySellReturn,
  netUnitPrice,
  returnActivities,
  returnedQty,
  sellReturnTotals,
  updateSellReturns,
  useSales,
  useSellReturns,
  type Sale,
  type SellReturn,
  type SellReturnLine,
} from "@/components/sales/sales-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const num = (v: string) => Number(v) || 0;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900";

/** Waits for the browser stores, so a return saved this session is found. */
export function SellReturnEdit({ id }: { id: number }) {
  const hydrated = useHydrated();
  const returns = useSellReturns();
  const sales = useSales();
  if (!hydrated) return <p className="text-[13px] text-muted">Loading…</p>;
  const ret = returns.find((r) => r.id === id);
  const sale = ret && sales.find((s) => s.id === ret.saleId);
  if (!ret || !sale)
    return (
      <Card>
        <p className="text-[13px] text-muted">
          That sell return doesn&apos;t exist any more.{" "}
          <Link href="/sell-returns" className="font-medium text-brand-500 hover:underline">
            Back to sell returns
          </Link>
        </p>
      </Card>
    );
  return <EditForm ret={ret} sale={sale} returns={returns} />;
}

function EditForm({ ret, sale, returns }: { ret: SellReturn; sale: Sale; returns: SellReturn[] }) {
  const router = useRouter();
  const customers = useCustomers();
  const [products] = useDemoProducts();
  const customer = customers.find((c) => c.id === sale.customerId)?.name ?? "Unknown customer";
  const others = returns.filter((r) => r.id !== ret.id);
  const unitOf = (productId: number) => products.find((p) => p.id === productId)?.unit ?? "Pcs";

  const [ref, setRef] = useState(ret.ref);
  const [date, setDate] = useState(ret.date);
  const [qty, setQty] = useState<Record<string, string>>(() =>
    Object.fromEntries(ret.lines.map((l) => [l.sku, String(l.qty)])),
  );
  const [discountType, setDiscountType] = useState(ret.discountType ?? "None");
  const [discountAmount, setDiscountAmount] = useState((ret.discountAmount ?? 0).toFixed(2));
  const [errors, setErrors] = useState<string[]>([]);

  const rows = sale.lines.map((l) => {
    const already = returnedQty(others, sale.id, l.sku);
    return { line: l, already, max: l.qty - already };
  });
  const lines: SellReturnLine[] = rows
    .filter((r) => num(qty[r.line.sku] ?? "") > 0)
    .map((r) => ({ productId: r.line.productId, sku: r.line.sku, name: r.line.name, qty: num(qty[r.line.sku]), unitPrice: netUnitPrice(r.line) }));
  const t = sellReturnTotals({
    lines,
    tax: ret.tax,
    refunds: ret.refunds,
    discountType,
    discountAmount: num(discountAmount),
  });

  function save() {
    const next: string[] = [];
    if (!ref.trim()) next.push("Invoice no is required");
    else if (others.some((r) => r.ref === ref.trim())) next.push(`${ref.trim()} is already used`);
    if (lines.length === 0) next.push("Enter a return quantity for at least one product");
    for (const r of rows)
      if (num(qty[r.line.sku] ?? "") > r.max + 0.0001) next.push(`${r.line.name}: only ${r.max.toFixed(2)} can be returned`);
    if (t.refunded > t.total + 0.004)
      next.push(`${USD.format(t.refunded)} is already refunded, more than the new total ${USD.format(t.total)}`);
    setErrors(next);
    if (next.length) return;

    const updated: SellReturn = {
      ...ret,
      ref: ref.trim(),
      date,
      lines,
      discountType,
      discountAmount: num(discountAmount),
      activities: [
        ...returnActivities(ret),
        { date: new Date().toISOString().slice(0, 16), action: "Edited", by: "Adnan Ahmed", note: "" },
      ],
    };
    updateSellReturns((prev) => prev.map((r) => (r.id === ret.id ? updated : r)));
    // swap the old quantities for the new ones in stock
    updateProducts((prev) =>
      applySellReturn(applySellReturn(prev, ret, sale.location, customer, -1), updated, sale.location, customer, 1),
    );
    router.push("/sell-returns");
  }

  return (
    <div className="flex flex-col gap-5">
      <Card title="Parent sale" bodyClassName="border-t border-line pt-4">
        <div className="grid gap-3 text-[13px] sm:grid-cols-2">
          <div>
            <Pair label="Invoice no">
              <Link href={`/sales?view=${sale.id}`} className="font-mono text-brand-500 hover:underline">
                {sale.invoiceNo}
              </Link>
            </Pair>
            <Pair label="Date">{day(sale.date)}</Pair>
          </div>
          <div>
            <Pair label="Customer">{customer}</Pair>
            <Pair label="Business location">{sale.location}</Pair>
          </div>
        </div>
      </Card>

      <Card bodyClassName="pt-5">
        {errors.length > 0 && (
          <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
            {errors.join(" · ")}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <Label>Invoice no</Label>
            <input value={ref} onChange={(event) => setRef(event.target.value)} className={cn(inputClass, "font-mono")} />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label>Date *</Label>
            <input type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
          </label>
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[820px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line bg-surface text-xs text-muted">
                <th className="px-3 py-2.5 font-medium">#</th>
                <th className="px-3 py-2.5 font-medium">Product name</th>
                <th className="px-3 py-2.5 text-right font-medium">Unit price</th>
                <th className="px-3 py-2.5 text-right font-medium">Sell quantity</th>
                <th className="px-3 py-2.5 text-right font-medium">Returned elsewhere</th>
                <th className="px-3 py-2.5 font-medium">Return quantity</th>
                <th className="px-3 py-2.5 text-right font-medium">Return subtotal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ line, already, max }, i) => {
                const value = qty[line.sku] ?? "";
                const over = num(value) > max + 0.0001;
                return (
                  <tr key={line.sku} className="border-b border-line last:border-0">
                    <td className="px-3 py-2.5 text-muted">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{line.name}</p>
                      <p className="font-mono text-xs text-muted">{line.sku}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{USD.format(netUnitPrice(line))}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {line.qty.toFixed(2)} {unitOf(line.productId)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted">{already.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <input
                        aria-label={`Return quantity of ${line.name}`}
                        value={value}
                        placeholder={max <= 0 ? "All returned" : `Up to ${max}`}
                        disabled={max <= 0}
                        onChange={(event) => setQty((prev) => ({ ...prev, [line.sku]: event.target.value.replace(/[^\d.]/g, "") }))}
                        inputMode="decimal"
                        className={cn(inputClass, "w-36 py-1.5 disabled:bg-surface", over && "border-red-500")}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">{USD.format(num(value) * netUnitPrice(line))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid items-start gap-4 md:grid-cols-[1fr_1fr_auto]">
          <label className="flex flex-col gap-1.5">
            <Label>Discount type</Label>
            <select
              value={discountType}
              onChange={(event) => setDiscountType(event.target.value as typeof discountType)}
              className={inputClass}
            >
              <option>None</option>
              <option>Fixed</option>
              <option>Percentage</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <Label>Discount amount</Label>
            <input
              value={discountAmount}
              disabled={discountType === "None"}
              onChange={(event) => setDiscountAmount(event.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              className={cn(inputClass, "disabled:bg-surface disabled:text-muted")}
            />
          </label>
          <dl className="grid min-w-72 grid-cols-[1fr_auto] gap-x-4 gap-y-1 self-end text-[13px]">
            <dt className="text-right text-muted">Total return discount:</dt>
            <dd className="text-right tabular-nums">(−) {USD.format(t.discount)}</dd>
            <dt className="text-right text-muted">Total return tax{ret.tax ? ` (${ret.tax})` : ""}:</dt>
            <dd className="text-right tabular-nums">(+) {USD.format(t.tax)}</dd>
            <dt className="text-right font-semibold">Return total:</dt>
            <dd className="text-right font-semibold tabular-nums">{USD.format(t.total)}</dd>
            {t.refunded > 0 && (
              <>
                <dt className="text-right text-muted">Already refunded:</dt>
                <dd className="text-right tabular-nums">{USD.format(t.refunded)}</dd>
              </>
            )}
          </dl>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
          <Link href="/sell-returns" className="inline-flex items-center rounded-lg border border-line px-3.5 py-2 text-sm font-medium transition-colors hover:bg-surface">
            Cancel
          </Link>
          <Button type="button" variant="brand" onClick={save}>
            Save
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{children}</span>;
}

function Pair({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p>
      <span className="text-muted">{label}:</span> <span className="font-medium">{children}</span>
    </p>
  );
}
