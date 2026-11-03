"use client";

/**
 * Purchase returns — goods sent back to a supplier. Saving one takes the
 * quantities out of stock; the supplier then owes us the return total, which
 * is settled with "Add payment".
 *
 * A return either stands on its own or comes from a purchase (its parent):
 * then it can't send back more than that purchase brought in.
 *
 * STAND-IN FOR THE API — replaced by the purchase return endpoints later.
 */

import { createDemoStore } from "@/components/inventory/demo-store";
import type { DemoProduct } from "@/components/inventory/products-data";
import { logStock } from "@/components/inventory/stock-history";
import { taxRate, type PurchasePayment } from "@/components/purchases/purchases-data";

export type ReturnLine = {
  productId: number;
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
};

export type PurchaseReturn = {
  id: number;
  ref: string;
  /** ISO date-time. */
  date: string;
  location: string;
  supplierId: number;
  /** Reference of the purchase this return comes from, if any. */
  parentRef: string | null;
  lines: ReturnLine[];
  tax: string | null;
  payments: PurchasePayment[];
  addedBy: string;
};

// starts empty, like the old screen
const store = createDemoStore<PurchaseReturn>("opalpay.demo-purchase-returns", []);
export const usePurchaseReturns = store.use;
export const updatePurchaseReturns = store.update;

const round = (n: number) => Math.round(n * 100) / 100;

export function returnTotals(r: Pick<PurchaseReturn, "lines" | "tax" | "payments">) {
  const net = round(r.lines.reduce((t, l) => t + l.qty * l.unitPrice, 0));
  const tax = round(net * taxRate(r.tax));
  const total = round(net + tax);
  const paid = round(r.payments.reduce((t, p) => t + p.amount, 0));
  return { items: r.lines.reduce((t, l) => t + l.qty, 0), net, tax, total, paid, due: round(Math.max(0, total - paid)) };
}

export function returnPaymentStatus(r: PurchaseReturn): "Paid" | "Partial" | "Due" {
  const t = returnTotals(r);
  return t.due <= 0 ? "Paid" : t.paid > 0 ? "Partial" : "Due";
}

/** `sign` 1 sends the goods back (stock down), -1 undoes it (return deleted). */
export function applyReturn(
  products: DemoProduct[],
  ret: PurchaseReturn,
  supplierName: string,
  sign: 1 | -1,
): DemoProduct[] {
  return products.map((p) => {
    const lines = ret.lines.filter((l) => l.productId === p.id);
    if (!lines.length) return p;
    const qtyOf = (sku: string) => -sign * lines.filter((l) => l.sku === sku).reduce((t, l) => t + l.qty, 0);
    const next: DemoProduct = p.variations.length
      ? { ...p, variations: p.variations.map((v) => ({ ...v, stock: v.stock + qtyOf(v.sku) })) }
      : { ...p, stock: p.stock + qtyOf(p.sku) };
    if (next.variations.length) next.stock = next.variations.reduce((t, v) => t + v.stock, 0);
    return logStock(
      next,
      lines.map((l) => ({
        sku: l.sku,
        qty: -sign * l.qty,
        location: ret.location,
        type: "Purchase return" as const,
        ref: ret.ref,
        party: supplierName,
      })),
    );
  });
}

/** Next "PR2026/0001" style reference. */
export function nextReturnRef(list: PurchaseReturn[]) {
  const n = Math.max(0, ...list.map((r) => Number(r.ref.split("/")[1]) || 0)) + 1;
  return `PR${new Date().getFullYear()}/${String(n).padStart(4, "0")}`;
}
