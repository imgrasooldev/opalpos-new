import type { Metadata } from "next";

import { DEMO_SESSION } from "@/components/dashboard/dashboard-data";
import { ShopSubscription } from "@/components/platform/shop-subscription";
import { ConsoleShell } from "@/components/shell/console-shell";

export const metadata: Metadata = {
  title: "Subscription",
};

/** Settings -> Subscription: the shop's plan, features and invoices. */
export default function SubscriptionPage() {
  const { user, store, today } = DEMO_SESSION;
  return (
    <ConsoleShell section="Subscription" store={store} user={user} today={today}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Subscription</h1>
          <p className="mt-1 text-[13px] text-muted">Your plan, the features you pay for, and your invoices.</p>
        </div>
        <ShopSubscription />
      </div>
    </ConsoleShell>
  );
}
