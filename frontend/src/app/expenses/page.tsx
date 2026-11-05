import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { ExpensesScreen } from "@/components/expenses/expenses-screen";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Expenses",
};

/** Expenses -> List expenses. */
export default function ExpensesPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Expenses" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Expenses</h1>
          <p className="mt-1 text-[13px] text-muted">Rent, bills, salaries and other running costs, and what is still unpaid.</p>
        </div>

        <ExpensesScreen />
      </div>
    </ConsoleShell>
  );
}
