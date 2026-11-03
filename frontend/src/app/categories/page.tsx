import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { CategoriesScreen } from "@/components/inventory/categories-screen";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Categories",
};

/** Inventory -> Categories. */
export default function CategoriesPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Categories" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Categories</h1>
          <p className="mt-1 text-[13px] text-muted">Manage your categories and sub categories.</p>
        </div>

        <CategoriesScreen />
      </div>
    </ConsoleShell>
  );
}
