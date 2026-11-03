"use client";

/**
 * Stock adjustments: stock written off at a location (damage, leakage,
 * theft, fire). Saving one takes the quantities out of stock and logs a
 * "Stock adjustment" line in each product's stock history; deleting it puts
 * the stock back.
 *
 * STAND-IN FOR THE API: replaced by the stock adjustment endpoints later.
 */

import { createDemoStore } from "@/components/inventory/demo-store";
import type { DemoProduct } from "@/components/inventory/products-data";
import { logStock } from "@/components/inventory/stock-history";

export const ADJUSTMENT_TYPES = ["Normal", "Abnormal"] as const;
export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

/** Shown next to the Adjustment type field, as in the old screen. */
export const ADJUSTMENT_TYPE_HELP =
  "Normal: adjustment for normal reasons like leakage, damage etc. Abnormal: adjustment for reasons like fire, accident, theft etc.";
export const RECOVERED_HELP = "Amount recovered from insurance, selling the scrap or anything else.";

export type AdjustmentLine = { productId: number; sku: string; name: string; qty: number; unitPrice: number };

export type StockAdjustment = {
  id: number;
  ref: string;
  /** ISO date-time. */
  date: string;
  location: string;
  type: AdjustmentType;
  lines: AdjustmentLine[];
  recovered: number;
  reason: string;
  addedBy: string;
};

/**
 * The demo product "Rolling Papers King Size" already shows 6 packs written
 * off as SA2026/0004 in its generated stock history; this is that record.
 */
export const DEMO_ADJUSTMENTS: StockAdjustment[] = [
  {
    id: 1,
    ref: "SA2026/0004",
    date: "2026-10-20T16:05",
    location: "GR Store",
    type: "Normal",
    lines: [{ productId: 4, sku: "AC-2001", name: "Rolling Papers King Size", qty: 6, unitPrice: 0.6 }],
    recovered: 0,
    reason: "Water damage in the back store",
    addedBy: "Sara Khan",
  },
];

const store = createDemoStore<StockAdjustment>("opalpay.demo-stock-adjustments", DEMO_ADJUSTMENTS);
export const useAdjustments = store.use;
export const updateAdjustments = store.update;

const round = (n: number) => Math.round(n * 100) / 100;

export function adjustmentTotals(a: Pick<StockAdjustment, "lines">) {
  return {
    items: a.lines.reduce((s, l) => s + l.qty, 0),
    total: round(a.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)),
  };
}

/**
 * Takes the adjusted quantities out of stock and logs them (`sign` 1), or
 * puts them back when the adjustment is deleted (-1).
 */
export function applyAdjustment(products: DemoProduct[], a: StockAdjustment, sign: 1 | -1): DemoProduct[] {
  return products.map((p) => {
    const lines = a.lines.filter((l) => l.productId === p.id);
    if (!lines.length || p.manageStock === false) return p;
    const qtyOf = (sku: string) => sign * lines.filter((l) => l.sku === sku).reduce((t, l) => t + l.qty, 0);
    const next: DemoProduct = p.variations.length
      ? { ...p, variations: p.variations.map((v) => ({ ...v, stock: v.stock - qtyOf(v.sku) })) }
      : { ...p, stock: p.stock - qtyOf(p.sku) };
    if (next.variations.length) next.stock = next.variations.reduce((t, v) => t + v.stock, 0);
    return logStock(
      next,
      lines.map((l) => ({ sku: l.sku, qty: -sign * l.qty, location: a.location, type: "Stock adjustment" as const, ref: a.ref, party: a.reason || null })),
    );
  });
}

/** Next "SA2026/0005" style reference. */
export function nextAdjustmentRef(list: StockAdjustment[]) {
  const n = Math.max(0, ...list.map((a) => Number(a.ref.split("/")[1]) || 0)) + 1;
  return `SA${new Date().getFullYear()}/${String(n).padStart(4, "0")}`;
}
