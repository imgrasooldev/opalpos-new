"use client";

/**
 * Purchases and suppliers — demo stores plus the purchase maths.
 *
 * A purchase's totals are always derived from its lines and charges (never
 * stored), so the list, the view and the form can't disagree. Only Received
 * purchases change stock; see `receiveStock`.
 *
 * STAND-IN FOR THE API — replaced by the purchases endpoints later.
 */

import { createDemoStore } from "@/components/inventory/demo-store";
import type { DemoProduct } from "@/components/inventory/products-data";
import { logStock } from "@/components/inventory/stock-history";

export type Supplier = {
  id: number;
  name: string;
  businessName: string;
  mobile: string;
  address: string;
};

export const DEMO_SUPPLIERS: Supplier[] = [
  { id: 1, name: "Imran Wholesale", businessName: "Imran Traders", mobile: "+1 555 020 1001", address: "21 Commerce St, Dallas, TX" },
  { id: 2, name: "Cloud Co Distribution", businessName: "Cloud Co", mobile: "+1 555 020 1002", address: "400 Vapor Ave, Austin, TX" },
  { id: 3, name: "Glassworks Supply", businessName: "Pure Glass LLC", mobile: "+1 555 020 1003", address: "9 Kiln Rd, Houston, TX" },
];

const suppliers = createDemoStore<Supplier>("opalpay.demo-suppliers", DEMO_SUPPLIERS);
export const updateSuppliers = suppliers.update;
export const useSuppliers = suppliers.use;

export const PURCHASE_STATUSES = ["Received", "Pending", "Ordered"] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];
export const PAYMENT_METHODS = ["Cash", "Card", "Cheque", "Bank transfer", "Other"];

export type PurchaseLine = {
  productId: number;
  sku: string;
  /** "Black Berry - Red" for a variation. */
  name: string;
  qty: number;
  /** Unit cost before discount. */
  unitCost: number;
  discountPct: number;
  /** Unit selling price to set on the product (inc. tax). */
  sellingPrice: number;
};

export type PurchasePayment = { amount: number; method: string; date: string; note: string };

export type Purchase = {
  id: number;
  ref: string;
  /** ISO date-time. */
  date: string;
  location: string;
  supplierId: number;
  status: PurchaseStatus;
  /** e.g. "30 days"; null when not set. */
  payTerm: string | null;
  lines: PurchaseLine[];
  discountType: "None" | "Fixed" | "Percentage";
  discountAmount: number;
  /** Applied purchase tax, e.g. "Sales tax 8.25%". */
  tax: string | null;
  shippingDetails: string;
  shipping: number;
  expenses: { name: string; amount: number }[];
  notes: string;
  payments: PurchasePayment[];
  addedBy: string;
};

/** Demo: only Ordered / Pending, so they haven't touched stock yet. */
export const DEMO_PURCHASES: Purchase[] = [
  {
    id: 1,
    ref: "PO2026/0001",
    date: "2026-10-28T11:30",
    location: "GR Store",
    supplierId: 2,
    status: "Ordered",
    payTerm: "30 days",
    lines: [
      { productId: 1, sku: "548485178656-1", name: "Black Berry - Red", qty: 50, unitCost: 8.5, discountPct: 0, sellingPrice: 15 },
      { productId: 1, sku: "548485178656-2", name: "Black Berry - Blue", qty: 50, unitCost: 8.5, discountPct: 0, sellingPrice: 15 },
    ],
    discountType: "None",
    discountAmount: 0,
    tax: null,
    shippingDetails: "",
    shipping: 0,
    expenses: [],
    notes: "",
    payments: [{ amount: 300, method: "Bank transfer", date: "2026-10-28T11:35", note: "Advance" }],
    addedBy: "Adnan Ahmed",
  },
  {
    id: 2,
    ref: "PO2026/0002",
    date: "2026-11-01T15:10",
    location: "City Outlet",
    supplierId: 3,
    status: "Pending",
    payTerm: null,
    lines: [{ productId: 3, sku: "GL-1201", name: 'Glass Water Pipe 12"', qty: 10, unitCost: 22, discountPct: 5, sellingPrice: 45 }],
    discountType: "None",
    discountAmount: 0,
    tax: "Sales tax 8.25%",
    shippingDetails: "Fragile, freight",
    shipping: 15,
    expenses: [],
    notes: "",
    payments: [],
    addedBy: "Sara Khan",
  },
];

const purchases = createDemoStore<Purchase>("opalpay.demo-purchases", DEMO_PURCHASES);
export const updatePurchases = purchases.update;
export const usePurchases = purchases.use;

// ---------- maths ----------

const round = (n: number) => Math.round(n * 100) / 100;
/** "Sales tax 8.25%" -> 0.0825 */
export const taxRate = (tax: string | null) => (tax ? Number(tax.match(/([\d.]+)%/)?.[1] ?? 0) / 100 : 0);

/** Unit cost after the line discount (before tax). */
export const netUnitCost = (l: PurchaseLine) => round(l.unitCost * (1 - l.discountPct / 100));
export const lineTotal = (l: PurchaseLine) => round(l.qty * netUnitCost(l));
/** Margin from the net cost to the selling price. */
export const lineMargin = (l: PurchaseLine) => {
  const cost = netUnitCost(l);
  return cost > 0 ? ((l.sellingPrice / cost - 1) * 100) : 0;
};

export function totals(p: Pick<Purchase, "lines" | "discountType" | "discountAmount" | "tax" | "shipping" | "expenses" | "payments">) {
  const net = round(p.lines.reduce((t, l) => t + lineTotal(l), 0));
  const discount = round(
    p.discountType === "Fixed"
      ? Math.min(p.discountAmount, net)
      : p.discountType === "Percentage"
        ? (net * p.discountAmount) / 100
        : 0,
  );
  const tax = round((net - discount) * taxRate(p.tax));
  const expenses = round(p.expenses.reduce((t, e) => t + e.amount, 0));
  const total = round(net - discount + tax + p.shipping + expenses);
  const paid = round(p.payments.reduce((t, x) => t + x.amount, 0));
  return {
    items: p.lines.reduce((t, l) => t + l.qty, 0),
    net,
    discount,
    tax,
    expenses,
    total,
    paid,
    due: round(Math.max(0, total - paid)),
  };
}

export type PaymentStatus = "Paid" | "Partial" | "Due" | "Overdue";

/** Paid / Partial / Due, or Overdue when unpaid past the pay term. */
export function paymentStatus(p: Purchase, today = new Date()): PaymentStatus {
  const t = totals(p);
  if (t.due <= 0) return "Paid";
  if (p.payTerm) {
    const [n, unit] = p.payTerm.split(" ");
    const dueDate = new Date(p.date);
    if (unit?.startsWith("month")) dueDate.setMonth(dueDate.getMonth() + Number(n));
    else dueDate.setDate(dueDate.getDate() + Number(n));
    if (dueDate < today) return "Overdue";
  }
  return t.paid > 0 ? "Partial" : "Due";
}

/**
 * Applies a purchase's lines to stock: `sign` 1 receives it, -1 reverses it
 * (deleted, or no longer Received). Receiving also sets the products' purchase
 * and selling prices from the lines, like the old system.
 */
export function receiveStock(
  products: DemoProduct[],
  purchase: Purchase,
  supplierName: string,
  sign: 1 | -1,
): DemoProduct[] {
  return products.map((p) => {
    const lines = purchase.lines.filter((l) => l.productId === p.id);
    if (!lines.length) return p;
    const qtyOf = (sku: string) => lines.filter((l) => l.sku === sku).reduce((t, l) => t + l.qty, 0) * sign;
    const priced = (sku: string) => (sign === 1 ? lines.find((l) => l.sku === sku) : undefined);

    const next: DemoProduct = p.variations.length
      ? {
          ...p,
          variations: p.variations.map((v) => {
            const line = priced(v.sku);
            return {
              ...v,
              stock: v.stock + qtyOf(v.sku),
              ...(line ? { purchasePrice: netUnitCost(line), sellingPrice: line.sellingPrice } : {}),
            };
          }),
        }
      : (() => {
          const line = priced(p.sku);
          return {
            ...p,
            stock: p.stock + qtyOf(p.sku),
            ...(line ? { purchasePrice: netUnitCost(line), sellingPrice: line.sellingPrice } : {}),
          };
        })();
    if (next.variations.length) next.stock = next.variations.reduce((t, v) => t + v.stock, 0);

    return logStock(
      next,
      lines.map((l) => ({
        sku: l.sku,
        qty: l.qty * sign,
        location: purchase.location,
        type: "Purchase" as const,
        ref: purchase.ref,
        party: supplierName,
      })),
    );
  });
}

/** Next "PO2026/0003" style reference. */
export function nextRef(list: Purchase[]) {
  const n = Math.max(0, ...list.map((p) => Number(p.ref.split("/")[1]) || 0)) + 1;
  return `PO${new Date().getFullYear()}/${String(n).padStart(4, "0")}`;
}
