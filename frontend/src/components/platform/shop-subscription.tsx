"use client";

/**
 * Business console -> Settings -> Subscription: the shop's own view of what
 * it pays for.
 *   - status, current plan or features, next billing date and amount
 *   - usage against its limits
 *   - change the plan, add or drop features, extras, billing cycle and
 *     payment method (the next invoice changes), or stop auto renewal
 *   - the card renewals are charged to, with "Update card"; switching to
 *     card payments asks for a card first
 *   - its invoices: pay an open one by card, view or print a receipt
 *
 * Everything here writes to the same data the platform admin reads, so a
 * change shows up there straight away.
 */

import { useState, type ReactNode } from "react";

import { InvoiceDialog } from "@/components/platform/billing-screen";
import { CardSummary, UpdateCardDialog } from "@/components/platform/card-fields";
import { useBusinessAccess } from "@/components/platform/business-access";
import {
  STATE_TONE,
  USD,
  days,
  daysBetween,
  enabledFeatures,
  fmtDate,
  limitsOf,
  linesTotal,
  priceLines,
  subscriptionLabel,
  today,
  updateInvoices,
  updateSubscriptions,
  type Invoice,
} from "@/components/platform/platform-data";
import { UsageBar } from "@/components/platform/platform-ui";
import { PriceSummary, SubscriptionPicker, draftFrom, type Draft } from "@/components/platform/subscription-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { useHydrated } from "@/components/inventory/product-store";
import { cn } from "@/lib/cn";

const payByCard = (invoice: Invoice) =>
  updateInvoices((prev) => prev.map((i) => (i.id === invoice.id ? { ...i, status: "Paid", paidAt: today(), method: "Card", ref: `ch_${Date.now().toString(36).slice(-7)}` } : i)));

export function ShopSubscription() {
  const hydrated = useHydrated();
  const access = useBusinessAccess();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  /** "update": change the card; "apply": a card is needed before saving the changes. */
  const [cardFor, setCardFor] = useState<"update" | "apply" | null>(null);

  if (!hydrated) return <p className="py-10 text-center text-[13px] text-muted">Loading…</p>;
  const { business: b, sub, status, plans, features, invoices } = access;
  if (!b || !status) return null;
  if (!sub)
    return (
      <Card>
        <p className="text-[13px] text-muted">You don&apos;t have a subscription yet.</p>
      </Card>
    );

  const lines = priceLines(sub, plans, features);
  const limits = limitsOf(sub, plans);
  const enabled = enabledFeatures(sub, plans, features);
  const own = [...invoices].sort((x, y) => y.date.localeCompare(x.date));
  const on = today();
  const d = draft ?? draftFrom(sub, sub.planId ?? plans[0]?.id ?? 1);
  const changed = draft !== null && JSON.stringify(draftFrom(sub, sub.planId ?? 1)) !== JSON.stringify(d);
  const newTotal = linesTotal(priceLines(d, plans, features));
  const empty = d.planId === null && d.addOns.length === 0;

  function apply(card = sub?.card ?? null) {
    if (empty || !sub) return;
    // paying by card needs a card on file first
    if (d.method === "Card" && !card) return setCardFor("apply");
    updateSubscriptions((prev) => prev.map((s) => (s.businessId === sub.businessId ? { ...s, ...d, customPrice: s.customPrice, card } : s)));
    setSaved(`Saved. Your next invoice${status?.nextBilling ? ` on ${fmtDate(status.nextBilling)}` : ""} is ${USD.format(newTotal)}.`);
    setDraft(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 xl:grid-cols-3">
        <Card
          title={
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              Your subscription
              <Badge tone={STATE_TONE[status.state]}>{status.state}</Badge>
            </h2>
          }
          className="xl:col-span-2"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <dl className="flex flex-col gap-2.5 text-[13px]">
              <Row label="You have">
                <span className="font-semibold">{subscriptionLabel(sub, plans)}</span>
              </Row>
              <Row label="Billing">
                {sub.cycle} · {sub.method}
              </Row>
              {sub.method === "Card" && (
                <Row label="Card">
                  <span className="inline-flex flex-wrap items-center justify-end gap-2">
                    {sub.card ? <CardSummary card={sub.card} /> : <span className="text-rose-600">No card on file</span>}
                    <button type="button" onClick={() => setCardFor("update")} className="rounded-md border border-line px-2 py-0.5 text-xs font-medium hover:bg-surface">
                      {sub.card ? "Update" : "Add card"}
                    </button>
                  </span>
                </Row>
              )}
              <Row label={status.inTrial ? "Free trial" : "This period"}>
                {status.inTrial ? `until ${fmtDate(sub.trialEndDate)} (${days(daysBetween(on, sub.trialEndDate) + 1)} left)` : `${fmtDate(sub.periodStart)} - ${fmtDate(sub.periodEnd)}`}
              </Row>
              <Row label="Next payment">
                {status.nextBilling ? (
                  <>
                    {fmtDate(status.nextBilling)} · <b>{USD.format(linesTotal(lines))}</b>
                  </>
                ) : (
                  <span className="text-rose-600">None: ends {fmtDate(sub.periodEnd)}</span>
                )}
              </Row>
              <Row label="Auto renewal">
                <button
                  type="button"
                  onClick={() =>
                    setConfirm(
                      sub.autoRenew
                        ? {
                            tone: "warning",
                            title: "Stop auto renewal?",
                            confirmLabel: "Stop renewal",
                            message: `Your subscription ends on ${fmtDate(sub.periodEnd)} and nothing more is charged. You can switch it back on before then.`,
                            onConfirm: () => updateSubscriptions((prev) => prev.map((s) => (s.businessId === sub.businessId ? { ...s, autoRenew: false, cancelledAt: on } : s))),
                          }
                        : {
                            tone: "success",
                            confirmLabel: "Renew automatically",
                            message: `Your subscription renews on ${fmtDate(status.nextBilling ?? sub.periodEnd)} for ${USD.format(linesTotal(lines))}.`,
                            onConfirm: () => updateSubscriptions((prev) => prev.map((s) => (s.businessId === sub.businessId ? { ...s, autoRenew: true, cancelledAt: "" } : s))),
                          },
                    )
                  }
                  className={cn("rounded-md border px-2 py-0.5 text-xs font-medium", sub.autoRenew ? "border-emerald-500/40 text-emerald-700" : "border-rose-500/40 text-rose-600")}
                >
                  {sub.autoRenew ? "On · stop" : "Off · turn on"}
                </button>
              </Row>
            </dl>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Features you can use</p>
              <ul className="mt-2 grid gap-1.5 text-[13px]">
                <li className="flex items-center gap-2 font-medium">
                  <Icon name="check" className="h-3.5 w-3.5 text-emerald-600" />
                  Core POS
                </li>
                {features
                  .filter((f) => !f.core && !f.unit)
                  .map((f) => (
                    <li key={f.key} className={cn("flex items-center gap-2", !enabled.has(f.key) && "text-muted")}>
                      <Icon name={enabled.has(f.key) ? "check" : "close"} className={cn("h-3.5 w-3.5", enabled.has(f.key) ? "text-emerald-600" : "text-zinc-400")} />
                      {f.name}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </Card>
        <Card title="Usage">
          <div className="flex flex-col gap-3.5">
            <UsageBar label="Locations" used={b.locations} limit={limits.locations} />
            <UsageBar label="Users" used={b.users} limit={limits.users} />
            <UsageBar label="Products" used={b.products} limit={limits.products} />
            <UsageBar label="Invoices this month" used={b.invoicesThisMonth} limit={limits.invoices} />
          </div>
        </Card>
      </div>

      {saved && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[13px] text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <Icon name="check" className="h-4 w-4" />
          {saved}
        </p>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card title="Change your plan or features" action={<span className="text-xs text-muted">Changes switch on now; the price changes from the next invoice</span>} bodyClassName="border-t border-line pt-4">
          <SubscriptionPicker
            draft={d}
            onChange={(next) => {
              setDraft(next);
              setSaved(null);
            }}
            plans={plans}
            features={features}
            shopView
          />
        </Card>
        <div className="flex flex-col gap-3 xl:sticky xl:top-5">
          <PriceSummary draft={d} plans={plans} features={features} title="Next invoice" />
          {empty && <p className="text-xs text-red-600">Pick a plan or at least one feature.</p>}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1 justify-center" disabled={!changed} onClick={() => setDraft(null)}>
              Undo
            </Button>
            <Button type="button" variant="brand" className="flex-1 justify-center" disabled={!changed || empty} onClick={() => apply()}>
              Save changes
            </Button>
          </div>
        </div>
      </div>

      <Card title="Invoices" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-[13px]">
            <thead>
              <tr className="border-y border-line bg-surface text-xs text-muted">
                <th className="px-5 py-2.5 font-medium">Invoice</th>
                <th className="px-4 py-2.5 font-medium">Period</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                <th className="px-5 py-2.5 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {own.map((i) => {
                const late = i.status === "Unpaid" && i.dueDate < on;
                return (
                  <tr key={i.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-2.5">
                      <span className="font-mono text-xs">{i.invoiceNo}</span>
                      <span className="block text-xs text-muted">{fmtDate(i.date)}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs">
                      {fmtDate(i.periodStart)} - {fmtDate(i.periodEnd)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={i.status === "Paid" ? "green" : late ? "rose" : i.status === "Unpaid" ? "amber" : "neutral"}>{late ? "Overdue" : i.status}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">{USD.format(i.total)}</td>
                    <td className="px-5 py-2.5 text-right">
                      <span className="inline-flex gap-1.5">
                        {i.status === "Unpaid" && (
                          <button type="button" onClick={() => payByCard(i)} className="rounded-md bg-brand-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-600">
                            Pay {USD.format(i.total)}
                          </button>
                        )}
                        <button type="button" onClick={() => setViewing(i.id)} className="rounded-md border border-line px-2.5 py-1 text-xs font-medium hover:bg-surface">
                          {i.status === "Paid" ? "Receipt" : "View"}
                        </button>
                      </span>
                    </td>
                  </tr>
                );
              })}
              {own.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted">
                    {status.inTrial ? `No invoices yet: the first one is on ${fmtDate(sub.periodStart)}.` : "No invoices yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {viewing !== null && own.find((i) => i.id === viewing) && <InvoiceDialog invoice={own.find((i) => i.id === viewing)!} onClose={() => setViewing(null)} />}
      {cardFor && (
        <UpdateCardDialog
          title={cardFor === "apply" ? "Add a card to pay by card" : sub.card ? "Update card" : "Add card"}
          onClose={() => setCardFor(null)}
          onSave={(card) => {
            if (cardFor === "apply") apply(card);
            else {
              updateSubscriptions((prev) => prev.map((s) => (s.businessId === sub.businessId ? { ...s, card } : s)));
              setSaved(`Card ${card.brand} •••• ${card.last4} saved; renewals are charged to it.`);
            }
            setCardFor(null);
          }}
        />
      )}
      {confirm && (
        <ConfirmDialog
          {...confirm}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            confirm.onConfirm();
            setConfirm(null);
          }}
        />
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
