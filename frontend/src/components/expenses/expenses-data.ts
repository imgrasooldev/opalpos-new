"use client";

/**
 * Expenses: money the business spends that isn't stock (rent, bills,
 * salaries, repairs). Each expense has a category (and an optional sub
 * category), a location, an optional tax, the staff member it is for, an
 * optional contact, recurring details and the payments made against it.
 *
 * STAND-IN FOR THE API: replaced by the expense endpoints later.
 */

import { createDemoStore } from "@/components/inventory/demo-store";
import type { PurchasePayment } from "@/components/purchases/purchases-data";

export type ExpenseCategory = { id: number; name: string; code: string; parentId: number | null };

export const DEMO_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 1, name: "Rent", code: "EXP-01", parentId: null },
  { id: 2, name: "Utilities", code: "EXP-02", parentId: null },
  { id: 3, name: "Electricity", code: "EXP-02-1", parentId: 2 },
  { id: 4, name: "Internet", code: "EXP-02-2", parentId: 2 },
  { id: 5, name: "Salaries", code: "EXP-03", parentId: null },
  { id: 6, name: "Maintenance", code: "EXP-04", parentId: null },
  { id: 7, name: "Repairs", code: "EXP-04-1", parentId: 6 },
  { id: 8, name: "Office supplies", code: "EXP-05", parentId: null },
];

const categories = createDemoStore<ExpenseCategory>("opalpay.demo-expense-categories", DEMO_EXPENSE_CATEGORIES);
export const useExpenseCategories = categories.use;
export const updateExpenseCategories = categories.update;

export const RECUR_UNITS = ["Days", "Months", "Years"] as const;
export type RecurUnit = (typeof RECUR_UNITS)[number];

export type ExpenseRecurring = {
  every: number;
  unit: RecurUnit;
  /** How many times it repeats; null = until stopped. */
  repetitions: number | null;
};

/** A contact the expense was paid to: a customer or a supplier. */
export type ExpenseContact = { kind: "customer" | "supplier"; id: number };

export type ExpensePayment = PurchasePayment & { ref?: string };

export type Expense = {
  id: number;
  ref: string;
  /** ISO date-time. */
  date: string;
  location: string;
  categoryId: number | null;
  subCategoryId: number | null;
  /** e.g. "Sales tax 8.25%", or null. */
  tax: string | null;
  /** Total amount, tax included. */
  total: number;
  /** User id of the staff member the expense is for. */
  expenseFor: number | null;
  contact: ExpenseContact | null;
  recurring: ExpenseRecurring | null;
  note: string;
  /** A refund is money coming back (a returned deposit, an overcharge); it counts against the expense totals. */
  isRefund: boolean;
  /** File name of the attached document, if any. */
  document: string | null;
  payments: ExpensePayment[];
  addedBy: string;
};

export const DEMO_EXPENSES: Expense[] = [
  {
    id: 1,
    ref: "EP2026/0001",
    date: "2026-11-01T10:00",
    location: "GR Store",
    categoryId: 1,
    subCategoryId: null,
    tax: null,
    total: 2500,
    expenseFor: null,
    contact: null,
    recurring: { every: 1, unit: "Months", repetitions: null },
    note: "Shop rent for November",
    isRefund: false,
    document: null,
    payments: [{ ref: "PP2026/0001", amount: 2500, method: "Bank transfer", date: "2026-11-01T10:05", note: "" }],
    addedBy: "Adnan Ahmed",
  },
  {
    id: 2,
    ref: "EP2026/0002",
    date: "2026-11-02T15:30",
    location: "GR Store",
    categoryId: 2,
    subCategoryId: 3,
    tax: "Sales tax 8.25%",
    total: 216.5,
    expenseFor: null,
    contact: null,
    recurring: null,
    note: "October electricity bill",
    isRefund: false,
    document: null,
    payments: [{ ref: "PP2026/0002", amount: 100, method: "Cash", date: "2026-11-02T15:35", note: "First part" }],
    addedBy: "Sara Khan",
  },
  {
    id: 3,
    ref: "EP2026/0003",
    date: "2026-11-03T12:10",
    location: "City Outlet",
    categoryId: 6,
    subCategoryId: 7,
    tax: null,
    total: 85,
    expenseFor: 4,
    contact: { kind: "supplier", id: 3 },
    recurring: null,
    note: "Fixed the display cabinet glass",
    isRefund: false,
    document: null,
    payments: [],
    addedBy: "Sara Khan",
  },
];

const store = createDemoStore<Expense>("opalpay.demo-expenses", DEMO_EXPENSES);
export const useExpenses = store.use;
export const updateExpenses = store.update;

const round = (n: number) => Math.round(n * 100) / 100;

export type ExpensePaymentStatus = "Paid" | "Partial" | "Due";

export function expenseTotals(e: Pick<Expense, "total" | "payments">) {
  const paid = round(e.payments.reduce((s, p) => s + p.amount, 0));
  return { paid, due: Math.max(0, round(e.total - paid)) };
}

export function expenseStatus(e: Pick<Expense, "total" | "payments">): ExpensePaymentStatus {
  const { paid, due } = expenseTotals(e);
  return due <= 0 ? "Paid" : paid > 0 ? "Partial" : "Due";
}

/** The total as it counts in sums: refunds count as negative. */
export const signedTotal = (e: Pick<Expense, "total" | "isRefund">) => (e.isRefund ? -e.total : e.total);

/** "Every 1 month(s)" plus the repetitions, as the Recurring details column shows it. */
export function recurringText(r: ExpenseRecurring | null) {
  if (!r) return "";
  const unit = r.unit.toLowerCase().replace(/s$/, "");
  return `Every ${r.every} ${unit}(s)${r.repetitions ? ` · ${r.repetitions} times` : ""}`;
}

/** Next "EP2026/0004" style reference. */
export function nextExpenseRef(list: Expense[]) {
  const n = Math.max(0, ...list.map((e) => Number(e.ref.split("/")[1]) || 0)) + 1;
  return `EP${new Date().getFullYear()}/${String(n).padStart(4, "0")}`;
}

/** Next "PP2026/0003" style payment reference, counted over every expense payment. */
export function nextExpensePaymentRef(list: Expense[]) {
  const n = Math.max(0, ...list.flatMap((e) => e.payments).map((p) => Number(p.ref?.split("/")[1]) || 0)) + 1;
  return `PP${new Date().getFullYear()}/${String(n).padStart(4, "0")}`;
}
