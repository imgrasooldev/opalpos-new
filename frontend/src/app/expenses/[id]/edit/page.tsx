import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { ExpenseEdit } from "@/components/expenses/expense-edit";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Edit expense",
};

/** Expenses -> List expenses -> Edit. */
export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { user, store, today } = DEMO_SESSION;
  const { id } = await params;

  return (
    <ConsoleShell section="Edit expense" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Edit expense</h1>
          <p className="mt-1 text-[13px] text-muted">Change the expense. Its payments are managed from the list.</p>
        </div>

        <ExpenseEdit key={id} id={Number(id)} />
      </div>
    </ConsoleShell>
  );
}
