import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { DraftsScreen } from "@/components/sales/drafts-screen";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Drafts",
};

/** Sell -> List drafts. */
export default function DraftsPage() {
  const { user, store, today } = DEMO_SESSION;

  return (
    <ConsoleShell section="Drafts" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Drafts</h1>
          <p className="mt-1 text-[13px] text-muted">Sales put on hold. They don&apos;t touch stock until converted.</p>
        </div>

        <DraftsScreen />
      </div>
    </ConsoleShell>
  );
}
