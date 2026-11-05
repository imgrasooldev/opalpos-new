"use client";

/** Edit expense: waits for the browser store, then opens the form on the expense. */

import Link from "next/link";

import { ExpenseForm } from "@/components/expenses/expense-form";
import { useExpenses } from "@/components/expenses/expenses-data";
import { useHydrated } from "@/components/inventory/product-store";
import { Card } from "@/components/ui/card";

export function ExpenseEdit({ id }: { id: number }) {
  const hydrated = useHydrated();
  const expenses = useExpenses();
  if (!hydrated) return <p className="text-[13px] text-muted">Loading…</p>;
  const expense = expenses.find((e) => e.id === id);
  if (!expense)
    return (
      <Card>
        <p className="text-[13px] text-muted">
          That expense doesn&apos;t exist any more.{" "}
          <Link href="/expenses" className="font-medium text-brand-500 hover:underline">
            Back to expenses
          </Link>
        </p>
      </Card>
    );
  return <ExpenseForm initial={expense} />;
}
