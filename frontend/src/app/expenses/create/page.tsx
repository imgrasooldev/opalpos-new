import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Add expense",
};

/** Expenses -> Add expense. */
export default function AddExpensePage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Add expense" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Add expense</h1>
          <p className="mt-1 text-[13px] text-muted">Record a running cost and what you paid for it.</p>
        </div>

        <ExpenseForm />
      </div>
    </ConsoleShell>
  );
}
