"use client";

/**
 * Sales — demo store plus the sale maths, shared by All sales and Add sale.
 *
 * Totals are always derived from the lines and charges (never stored). Only
 * a Final sale moves stock: saving one takes its quantities out, deleting it
 * puts them back (logged as "Sell" in the product's stock history). Drafts,
 * quotations and proformas are kept but don't touch stock.
 *
 * STAND-IN FOR THE API — replaced by the sales endpoints later.
 */

import { createDemoStore } from "@/components/inventory/demo-store";
import type { DemoProduct } from "@/components/inventory/products-data";
import { logStock } from "@/components/inventory/stock-history";
import { taxRate } from "@/components/purchases/purchases-data";

export const SALE_STATUSES = ["Final", "Draft", "Quotation", "Proforma"] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];
export const SHIPPING_STATUSES = ["Ordered", "Packed", "Shipped", "Delivered", "Cancelled"] as const;
export const SALE_PAYMENT_METHODS = ["Cash", "Card", "Cheque", "Bank transfer", "Other"];
/** Opal Points: what one point is worth when redeemed. */
export const POINT_VALUE = 0.01;

export type SaleLine = {
  productId: number;
  sku: string;
  name: string;
  qty: number;
  /** Unit price (inc. tax) before the line discount. */
  unitPrice: number;
  discountType: "Fixed" | "Percentage";
  discount: number;
};

export type SalePayment = {
  amount: number;
  method: string;
  date: string;
  note: string;
  /** Payment reference, e.g. "SP2026/0001"; older demo payments have none. */
  ref?: string;
};

export type Sale = {
  id: number;
  invoiceNo: string;
  /** ISO date-time. */
  date: string;
  location: string;
  customerId: number;
  status: SaleStatus;
  payTerm: string | null;
  invoiceScheme: string;
  lines: SaleLine[];
  discountType: "None" | "Fixed" | "Percentage";
  discountAmount: number;
  pointsRedeemed: number;
  orderTax: string | null;
  sellNote: string;
  staffNote: string;
  shippingDetails: string;
  shippingAddress: string;
  shippingCharges: number;
  shippingStatus: (typeof SHIPPING_STATUSES)[number] | null;
  deliveredTo: string;
  expenses: { name: string; amount: number }[];
  payments: SalePayment[];
  addedBy: string;
  /** Where it was rung up: the Add sale form or the POS screen ("List POS"). */
  source: "Sale" | "POS";
};

function sale(s: Partial<Sale> & Pick<Sale, "id" | "invoiceNo" | "date" | "location" | "customerId" | "lines" | "payments">): Sale {
  return {
    status: "Final",
    payTerm: null,
    invoiceScheme: "Default",
    discountType: "None",
    discountAmount: 0,
    pointsRedeemed: 0,
    orderTax: null,
    sellNote: "",
    staffNote: "",
    shippingDetails: "",
    shippingAddress: "",
    shippingCharges: 0,
    shippingStatus: null,
    deliveredTo: "",
    expenses: [],
    addedBy: "Adnan Ahmed",
    source: "Sale",
    ...s,
  };
}

const line = (productId: number, sku: string, name: string, qty: number, unitPrice: number): SaleLine => ({
  productId,
  sku,
  name,
  qty,
  unitPrice,
  discountType: "Fixed",
  discount: 0,
});

/** Demo history: already counted in the products' "sold", so no stock moves. */
export const DEMO_SALES: Sale[] = [
  sale({
    id: 1,
    invoiceNo: "2026-094845",
    date: "2026-10-26T12:05",
    location: "GR Store",
    customerId: 3,
    payTerm: "30 days",
    lines: [line(3, "GL-1201", 'Glass Water Pipe 12"', 4, 45), line(7, "AC-2020-B", "Grinder 4-piece - Black", 10, 12)],
    discountType: "Percentage",
    discountAmount: 5,
    payments: [{ amount: 100, method: "Cheque", date: "2026-10-26T12:06", note: "" }],
    shippingDetails: "2 boxes",
    shippingAddress: "45 Mall Road, Lahore",
    shippingStatus: "Delivered",
    deliveredTo: "Kamran Khan",
    addedBy: "Sara Khan",
  }),
  sale({
    id: 2,
    invoiceNo: "2026-094846",
    source: "POS",
    date: "2026-10-28T16:40",
    location: "City Outlet",
    customerId: 2,
    lines: [line(9, "VP-1102", "Mango Flavor Pod", 3, 6.5)],
    payments: [{ amount: 19.5, method: "Card", date: "2026-10-28T16:40", note: "" }],
  }),
  sale({
    id: 3,
    invoiceNo: "2026-094847",
    source: "POS",
    date: "2026-10-31T11:15",
    location: "GR Store",
    customerId: 1,
    lines: [line(4, "AC-2001", "Rolling Papers King Size", 6, 1.5), line(5, "AC-2010", "Butane Refill 300ml", 2, 4.99)],
    orderTax: "Sales tax 8.25%",
    payments: [{ amount: 20.55, method: "Cash", date: "2026-10-31T11:15", note: "" }],
    sellNote: "Regular, buys every week",
  }),
  sale({
    id: 4,
    invoiceNo: "2026-094848",
    source: "POS",
    date: "2026-11-01T18:20",
    location: "GR Store",
    customerId: 1,
    lines: [line(6, "HK-3001", "Hookah Charcoal 1kg", 1, 7.99)],
    payments: [{ amount: 7.99, method: "Cash", date: "2026-11-01T18:20", note: "" }],
  }),
  sale({
    id: 5,
    invoiceNo: "2026-094849",
    date: "2026-11-02T10:45",
    location: "City Outlet",
    customerId: 5,
    lines: [line(1, "548485178656-1", "Black Berry - Red", 2, 15), line(10, "AC-2018", "Grinder 2-piece", 1, 6)],
    payments: [],
    staffNote: "Pays on Friday",
    shippingDetails: "1 parcel, courier",
    shippingAddress: "12 Garden Town, Lahore",
    shippingCharges: 0,
    shippingStatus: "Packed",
    addedBy: "Sara Khan",
  }),
  sale({
    id: 6,
    invoiceNo: "2026-094850",
    source: "POS",
    date: "2026-11-03T09:30",
    location: "GR Store",
    customerId: 1,
    lines: [line(5, "AC-2010", "Butane Refill 300ml", 1, 4.99), line(4, "AC-2001", "Rolling Papers King Size", 2, 1.5)],
    // handed over a $10 note: paid more than the total, so the due shows negative
    payments: [{ amount: 10, method: "Cash", date: "2026-11-03T09:30", note: "" }],
  }),
  sale({
    id: 7,
    invoiceNo: "2026-094851",
    source: "POS",
    date: "2026-11-03T11:05",
    location: "City Outlet",
    customerId: 2,
    lines: [line(9, "VP-1102", "Mango Flavor Pod", 4, 6.5)],
    payments: [{ amount: 20, method: "Cash", date: "2026-11-03T11:05", note: "" }],
    addedBy: "Sara Khan",
  }),
  sale({
    id: 8,
    invoiceNo: "DR2026/0001",
    status: "Draft",
    date: "2026-11-03T12:40",
    location: "GR Store",
    customerId: 3,
    lines: [line(3, "GL-1201", 'Glass Water Pipe 12"', 2, 45), line(6, "HK-3001", "Hookah Charcoal 1kg", 5, 7.99)],
    payments: [],
    sellNote: "Customer confirms on Friday",
  }),
  sale({
    id: 9,
    invoiceNo: "QT2026/0001",
    status: "Quotation",
    date: "2026-11-02T15:20",
    location: "City Outlet",
    customerId: 3,
    lines: [line(1, "548485178656-2", "Black Berry - Blue", 20, 14), line(9, "VP-1102", "Mango Flavor Pod", 30, 6)],
    discountType: "Percentage",
    discountAmount: 5,
    payments: [],
    sellNote: "Wholesale price, valid for 7 days",
    addedBy: "Sara Khan",
  }),
];

const store = createDemoStore<Sale>("opalpay.demo-sales", DEMO_SALES);
export const useSales = store.use;
export const updateSales = store.update;

// ---------- maths ----------

const round = (n: number) => Math.round(n * 100) / 100;

/** Unit price after the line discount. */
export const netUnitPrice = (l: SaleLine) =>
  round(l.discountType === "Percentage" ? l.unitPrice * (1 - l.discount / 100) : Math.max(0, l.unitPrice - l.discount));
export const lineSubtotal = (l: SaleLine) => round(l.qty * netUnitPrice(l));

export function saleTotals(
  s: Pick<Sale, "lines" | "discountType" | "discountAmount" | "pointsRedeemed" | "orderTax" | "shippingCharges" | "expenses" | "payments">,
) {
  const subtotal = round(s.lines.reduce((t, l) => t + lineSubtotal(l), 0));
  const discount = round(
    s.discountType === "Fixed"
      ? Math.min(s.discountAmount, subtotal)
      : s.discountType === "Percentage"
        ? (subtotal * s.discountAmount) / 100
        : 0,
  );
  const points = round(Math.min(s.pointsRedeemed * POINT_VALUE, subtotal - discount));
  const tax = round((subtotal - discount - points) * taxRate(s.orderTax));
  const expenses = round(s.expenses.reduce((t, e) => t + e.amount, 0));
  const total = round(subtotal - discount - points + tax + s.shippingCharges + expenses);
  const paid = round(s.payments.reduce((t, p) => t + p.amount, 0));
  return {
    items: s.lines.reduce((t, l) => t + l.qty, 0),
    subtotal,
    discount,
    points,
    tax,
    expenses,
    total,
    paid,
    /** Negative when the customer paid more than the total (as in the old list). */
    due: round(total - paid),
  };
}

export function salePaymentStatus(s: Sale): "Paid" | "Partial" | "Due" {
  const t = saleTotals(s);
  return t.due <= 0 ? "Paid" : t.paid > 0 ? "Partial" : "Due";
}

/** The method of the payments, or "Multiple" when they differ. */
export function saleMethod(s: Sale) {
  const methods = [...new Set(s.payments.map((p) => p.method))];
  return methods.length > 1 ? "Multiple" : (methods[0] ?? null);
}

/** `sign` 1 sells (stock down), -1 undoes the sale (deleted). */
export function applySale(products: DemoProduct[], s: Sale, customerName: string, sign: 1 | -1): DemoProduct[] {
  return products.map((p) => {
    const lines = s.lines.filter((l) => l.productId === p.id);
    if (!lines.length || p.manageStock === false) return p;
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
        location: s.location,
        type: "Sell" as const,
        ref: s.invoiceNo,
        party: customerName,
      })),
    );
  });
}

/** Reference prefix of drafts ("DR2026/0001") and quotations ("QT2026/0001"). */
export const HELD_PREFIX = { Draft: "DR", Quotation: "QT" } as const;
export type HeldKind = keyof typeof HELD_PREFIX;

/** Next draft or quotation reference, e.g. "DR2026/0002". */
export function nextHeldRef(list: Sale[], kind: HeldKind) {
  const prefix = HELD_PREFIX[kind];
  const n = Math.max(0, ...list.filter((s) => s.invoiceNo.startsWith(prefix)).map((s) => Number(s.invoiceNo.split("/")[1]) || 0)) + 1;
  return `${prefix}${new Date().getFullYear()}/${String(n).padStart(4, "0")}`;
}

/** Next invoice number after the highest one, e.g. "2026-094850". */
export function nextInvoiceNo(list: Sale[]) {
  const n = Math.max(94844, ...list.map((s) => Number(s.invoiceNo.split("-")[1]) || 0)) + 1;
  return `${new Date().getFullYear()}-${String(n).padStart(6, "0")}`;
}

// ---------- sell returns ----------

export type SellReturnLine = { productId: number; sku: string; name: string; qty: number; unitPrice: number };

/** Goods a customer brought back from a sale; refunds settle what we owe them. */
export type SellReturn = {
  id: number;
  ref: string;
  saleId: number;
  /** ISO date-time. */
  date: string;
  lines: SellReturnLine[];
  /** Same order tax as the sale, so the refund matches what was charged. */
  tax: string | null;
  refunds: SalePayment[];
  addedBy: string;
  /** Discount on the whole return (old "Discount type / amount"); none when missing. */
  discountType?: "None" | "Fixed" | "Percentage";
  discountAmount?: number;
  /** What happened to it, newest last (shown under "Activities" on View). */
  activities?: ReturnActivity[];
};

export type ReturnActivity = { date: string; action: "Added" | "Edited" | "Payment added" | "Payment deleted"; by: string; note: string };

/** Demo: one pod came back from 2026-094846 and hasn't been refunded yet. */
export const DEMO_SELL_RETURNS: SellReturn[] = [
  {
    id: 1,
    ref: "CN2026/0001",
    saleId: 2,
    date: "2026-10-29T12:10",
    lines: [{ productId: 9, sku: "VP-1102", name: "Mango Flavor Pod", qty: 1, unitPrice: 6.5 }],
    tax: null,
    refunds: [],
    addedBy: "Sara Khan",
  },
];

const returnStore = createDemoStore<SellReturn>("opalpay.demo-sell-returns", DEMO_SELL_RETURNS);
export const useSellReturns = returnStore.use;
export const updateSellReturns = returnStore.update;

export function sellReturnTotals(r: Pick<SellReturn, "lines" | "tax" | "refunds" | "discountType" | "discountAmount">) {
  const net = round(r.lines.reduce((t, l) => t + l.qty * l.unitPrice, 0));
  const amount = r.discountAmount ?? 0;
  const discount = round(
    r.discountType === "Fixed" ? Math.min(amount, net) : r.discountType === "Percentage" ? (net * amount) / 100 : 0,
  );
  const tax = round((net - discount) * taxRate(r.tax));
  const total = round(net - discount + tax);
  const refunded = round(r.refunds.reduce((t, p) => t + p.amount, 0));
  return {
    items: r.lines.reduce((t, l) => t + l.qty, 0),
    net,
    discount,
    tax,
    total,
    refunded,
    due: round(Math.max(0, total - refunded)),
  };
}

/** The activity log, falling back to "Added" for returns saved before it existed. */
export const returnActivities = (r: SellReturn): ReturnActivity[] =>
  r.activities?.length ? r.activities : [{ date: r.date, action: "Added", by: r.addedBy, note: "" }];

/** Quantity of one SKU already returned from a sale. */
export const returnedQty = (returns: SellReturn[], saleId: number, sku: string) =>
  returns
    .filter((r) => r.saleId === saleId)
    .flatMap((r) => r.lines)
    .filter((l) => l.sku === sku)
    .reduce((t, l) => t + l.qty, 0);

/** `sign` 1 takes the goods back into stock, -1 undoes it (return deleted). */
export function applySellReturn(
  products: DemoProduct[],
  r: SellReturn,
  location: string,
  customerName: string,
  sign: 1 | -1,
): DemoProduct[] {
  return products.map((p) => {
    const lines = r.lines.filter((l) => l.productId === p.id);
    if (!lines.length || p.manageStock === false) return p;
    const qtyOf = (sku: string) => sign * lines.filter((l) => l.sku === sku).reduce((t, l) => t + l.qty, 0);
    const next: DemoProduct = p.variations.length
      ? { ...p, variations: p.variations.map((v) => ({ ...v, stock: v.stock + qtyOf(v.sku) })) }
      : { ...p, stock: p.stock + qtyOf(p.sku) };
    if (next.variations.length) next.stock = next.variations.reduce((t, v) => t + v.stock, 0);
    return logStock(
      next,
      lines.map((l) => ({ sku: l.sku, qty: sign * l.qty, location, type: "Sell return" as const, ref: r.ref, party: customerName })),
    );
  });
}

/** Next "SP2026/0003" style payment reference, counted over every refund. */
export function nextPaymentRef(returns: SellReturn[]) {
  const n = Math.max(0, ...returns.flatMap((r) => r.refunds).map((p) => Number(p.ref?.split("/")[1]) || 0)) + 1;
  return `SP${new Date().getFullYear()}/${String(n).padStart(4, "0")}`;
}

/** Next "CN2026/0002" style credit note reference. */
export function nextSellReturnRef(list: SellReturn[]) {
  const n = Math.max(0, ...list.map((r) => Number(r.ref.split("/")[1]) || 0)) + 1;
  return `CN${new Date().getFullYear()}/${String(n).padStart(4, "0")}`;
}
