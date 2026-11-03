"use client";

/**
 * Stock transfers — moving stock from one business location to another.
 *
 * The demo keeps one stock figure per product (not per location), so a
 * completed transfer leaves the total alone and logs the move in the stock
 * history: "Stock transfer (out)" at the From location and "Stock transfer
 * (in)" at the To location. Pending / In transit transfers don't move stock.
 *
 * STAND-IN FOR THE API — replaced by the stock transfer endpoints later.
 */

import { createDemoStore } from "@/components/inventory/demo-store";
import type { DemoProduct } from "@/components/inventory/products-data";
import { logStock } from "@/components/inventory/stock-history";

export const TRANSFER_STATUSES = ["Pending", "In transit", "Completed"] as const;
export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

export type TransferLine = { productId: number; sku: string; name: string; qty: number; unitPrice: number };

export type StockTransfer = {
  id: number;
  ref: string;
  /** ISO date-time. */
  date: string;
  from: string;
  to: string;
  status: TransferStatus;
  lines: TransferLine[];
  shipping: number;
  notes: string;
  addedBy: string;
};

export const DEMO_TRANSFERS: StockTransfer[] = [
  {
    id: 1,
    ref: "ST2026/0001",
    date: "2026-11-02T16:30",
    from: "GR Store",
    to: "City Outlet",
    status: "In transit",
    lines: [
      { productId: 7, sku: "AC-2020-B", name: "Grinder 4-piece - Black", qty: 5, unitPrice: 6 },
      { productId: 3, sku: "GL-1201", name: 'Glass Water Pipe 12"', qty: 2, unitPrice: 22 },
    ],
    shipping: 8,
    notes: "Sent with the Tuesday van",
    addedBy: "Sara Khan",
  },
];

const store = createDemoStore<StockTransfer>("opalpay.demo-stock-transfers", DEMO_TRANSFERS);
export const useTransfers = store.use;
export const updateTransfers = store.update;

const round = (n: number) => Math.round(n * 100) / 100;

export function transferTotals(t: Pick<StockTransfer, "lines" | "shipping">) {
  const subtotal = round(t.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0));
  return { items: t.lines.reduce((s, l) => s + l.qty, 0), subtotal, total: round(subtotal + t.shipping) };
}

/**
 * Logs a completed transfer in each product's stock history (`sign` 1), or
 * undoes it (-1). The products also become available at the To location.
 */
export function applyTransfer(products: DemoProduct[], t: StockTransfer, sign: 1 | -1): DemoProduct[] {
  return products.map((p) => {
    const lines = t.lines.filter((l) => l.productId === p.id);
    if (!lines.length) return p;
    const next = sign === 1 && !p.locations.includes(t.to) ? { ...p, locations: [...p.locations, t.to] } : p;
    return logStock(
      next,
      lines.flatMap((l) => [
        { sku: l.sku, qty: -sign * l.qty, location: t.from, type: "Stock transfer (out)" as const, ref: t.ref, party: `To ${t.to}` },
        { sku: l.sku, qty: sign * l.qty, location: t.to, type: "Stock transfer (in)" as const, ref: t.ref, party: `From ${t.from}` },
      ]),
    );
  });
}

/** Next "ST2026/0002" style reference. */
export function nextTransferRef(list: StockTransfer[]) {
  const n = Math.max(0, ...list.map((t) => Number(t.ref.split("/")[1]) || 0)) + 1;
  return `ST${new Date().getFullYear()}/${String(n).padStart(4, "0")}`;
}
