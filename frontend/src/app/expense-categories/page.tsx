import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { ExpenseCategoriesScreen } from "@/components/expenses/expense-categories-screen";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Expense categories",
};

/** Expenses -> Expense categories. */
export default function ExpenseCategoriesPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Expense categories" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Expense categories</h1>
          <p className="mt-1 text-[13px] text-muted">Manage your expense categories.</p>
        </div>

        <ExpenseCategoriesScreen />
      </div>
    </ConsoleShell>
  );
}
