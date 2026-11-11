"use client";

/**
 * Platform admin -> Business: everything about one shop.
 *   - header with its status (and why), and actions: edit, manage
 *     subscription, suspend / activate, log in as business
 *   - subscription: what it bought (plan or single features, extras), the
 *     invoice lines, billing cycle, payment method, next billing date, and
 *     every feature it can use
 *   - usage against its limits, owner and first location, invoices (record
 *     payment, remind, view), and the platform team's notes
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { actAsBusiness } from "@/components/platform/business-access";
import { InvoiceDialog, PaymentDialog } from "@/components/platform/billing-screen";
import { CardSummary } from "@/components/platform/card-fields";
import { SuspendDialog } from "@/components/platform/businesses-screen";
import { useHydrated } from "@/components/inventory/product-store";
import {
  STATE_TONE,
  USD,
  businessStatus,
  days,
  daysBetween,
  enabledFeatures,
  fmtDate,
  limitsOf,
  linesTotal,
  priceLines,
  subscriptionLabel,
  today,
  updateBusinesses,
  updateInvoices,
  useBusinesses,
  useFeatures,
  useInvoices,
  usePlans,
  usePlatformSettings,
  useSubscriptions,
  type Invoice,
} from "@/components/platform/platform-data";
import { UsageBar, inputClass } from "@/components/platform/platform-ui";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export function BusinessView({ id }: { id: number }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const businesses = useBusinesses();
  const subs = useSubscriptions();
  const invoices = useInvoices();
  const plans = usePlans();
  const features = useFeatures();
  const settings = usePlatformSettings();
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [suspending, setSuspending] = useState(false);
  const [notes, setNotes] = useState<string | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const [paying, setPaying] = useState<Invoice | null>(null);

  if (!hydrated) return <p className="text-[13px] text-muted">Loading…</p>;
  const b = businesses.find((x) => x.id === id);
  if (!b)
    return (
      <Card>
        <p className="text-[13px] text-muted">
          That business doesn&apos;t exist any more.{" "}
          <Link href="/platform/businesses" className="font-medium text-brand-500 hover:underline">
            Back to businesses
          </Link>
        </p>
      </Card>
    );

  const sub = subs.find((s) => s.businessId === b.id);
  const status = businessStatus(b, sub, invoices, settings);
  const plan = plans.find((p) => p.id === sub?.planId);
  const lines = sub ? priceLines(sub, plans, features) : [];
  const enabled = enabledFeatures(sub, plans, features);
  const limits = limitsOf(sub, plans);
  const own = invoices.filter((i) => i.businessId === b.id).sort((x, y) => y.date.localeCompare(x.date));
  const paid = own.filter((i) => i.status === "Paid").reduce((t, i) => t + i.total, 0);
  const on = today();
  const remind = (i: Invoice) => updateInvoices((prev) => prev.map((x) => (x.id === i.id ? { ...x, reminders: [...x.reminders, on] } : x)));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-background p-5 shadow-sm shadow-navy-950/[0.03]">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-gradient text-lg font-semibold text-white">
            {b.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)}
          </span>
          <div>
            <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
              {b.name}
              <Badge tone={STATE_TONE[status.state]}>{status.state}</Badge>
            </h2>
            <p className="text-[13px] text-muted">
              #{String(b.id).padStart(4, "0")} · {[b.city, b.country].filter(Boolean).join(", ")} · signed up {fmtDate(b.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/platform/businesses/${b.id}/edit`} className={buttonStyles({ variant: "secondary" })}>
            <Icon name="pencil" className="h-4 w-4" />
            Edit
          </Link>
          <Link href={`/platform/businesses/${b.id}/subscription`} className={buttonStyles({ variant: "secondary" })}>
            <Icon name="card" className="h-4 w-4" />
            {sub ? "Manage subscription" : "Start subscription"}
          </Link>
          {b.suspended ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setConfirm({
                  tone: "success",
                  confirmLabel: "Activate",
                  message: `${b.name} will be able to log in and sell again${status.overdueDays > settings.graceDays ? ", once its overdue invoices are paid" : ""}.`,
                  onConfirm: () => updateBusinesses((prev) => prev.map((x) => (x.id === b.id ? { ...x, suspended: false, suspendReason: "" } : x))),
                })
              }
            >
              <Icon name="check" className="h-4 w-4" />
              Activate
            </Button>
          ) : (
            <Button type="button" variant="secondary" onClick={() => setSuspending(true)}>
              <Icon name="lock" className="h-4 w-4" />
              Suspend
            </Button>
          )}
          <Button
            type="button"
            variant="brand"
            onClick={() =>
              setConfirm({
                tone: "warning",
                title: `Log in as ${b.name}?`,
                confirmLabel: "Log in",
                message: `You'll open ${b.name}'s console as ${b.ownerName} to help with support. Everything you do there is logged against your admin account.`,
                onConfirm: () => {
                  actAsBusiness(b.id);
                  router.push("/dashboard");
                },
              })
            }
          >
            <Icon name="login" className="h-4 w-4" />
            Log in as business
          </Button>
        </div>
      </div>

      {status.reason && (
        <p
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-3 text-[13px]",
            status.state === "Suspended" ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200" : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
          )}
        >
          <Icon name="alert" className="h-4 w-4 shrink-0" />
          {status.reason}
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <Card
          title="Subscription"
          className="xl:col-span-2"
          action={
            sub && (
              <Link href={`/platform/businesses/${b.id}/subscription`} className="text-xs font-medium text-brand-500 hover:underline">
                Change
              </Link>
            )
          }
        >
          {!sub ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface px-4 py-4 text-[13px]">
              <span className="text-muted">No subscription: the shop has Core POS only and is asked to choose a plan.</span>
              <Link href={`/platform/businesses/${b.id}/subscription`} className={buttonStyles({ variant: "brand", size: "sm" })}>
                Start subscription
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-3">
                <dl className="flex flex-col gap-2.5 text-[13px]">
                  <Item label="Bought">
                    <span className="font-semibold">{subscriptionLabel(sub, plans)}</span>
                  </Item>
                  <Item label="Billing">
                    {sub.cycle} · {sub.method}
                  </Item>
                  {sub.method === "Card" && (
                    <Item label="Card on file">{sub.card ? <CardSummary card={sub.card} /> : <span className="text-rose-600">None</span>}</Item>
                  )}
                  <Item label={status.inTrial ? "Free trial" : "Current period"}>
                    {status.inTrial ? `until ${fmtDate(sub.trialEndDate)} (${days(daysBetween(on, sub.trialEndDate) + 1)} left)` : `${fmtDate(sub.periodStart)} - ${fmtDate(sub.periodEnd)}`}
                  </Item>
                  <Item label="Next billing">
                    {status.nextBilling ? (
                      <>
                        {fmtDate(status.nextBilling)} · <b>{USD.format(linesTotal(lines))}</b>
                      </>
                    ) : (
                      <span className="text-rose-600">Doesn&apos;t renew{sub.cancelledAt ? ` (cancelled ${fmtDate(sub.cancelledAt)})` : ""}</span>
                    )}
                  </Item>
                  <Item label="Customer since">{fmtDate(sub.startDate)}</Item>
                  <Item label="Total paid">
                    <span className="font-semibold">{USD.format(paid)}</span>
                  </Item>
                </dl>
                <ul className="divide-y divide-line rounded-lg border border-line text-[13px]">
                  {lines.map((l) => (
                    <li key={l.label} className="flex justify-between gap-3 px-3 py-2">
                      <span className={cn(l.amount < 0 && "text-emerald-600")}>{l.label}</span>
                      <span className="tabular-nums">{USD.format(l.amount)}</span>
                    </li>
                  ))}
                  <li className="flex justify-between gap-3 bg-surface px-3 py-2 font-semibold">
                    <span>Per {sub.cycle === "Monthly" ? "month" : "year"}</span>
                    <span className="tabular-nums">{USD.format(linesTotal(lines))}</span>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Features it can use</p>
                <ul className="mt-2 grid gap-1.5 text-[13px]">
                  <li className="flex items-center gap-2 font-medium">
                    <Icon name="check" className="h-3.5 w-3.5 text-emerald-600" />
                    Core POS
                  </li>
                  {features
                    .filter((f) => !f.core && !f.unit)
                    .map((f) => {
                      const has = enabled.has(f.key);
                      const fromPlan = plan?.features.includes(f.key);
                      return (
                        <li key={f.key} className={cn("flex items-center gap-2", !has && "text-muted")}>
                          <Icon name={has ? "check" : "close"} className={cn("h-3.5 w-3.5", has ? "text-emerald-600" : "text-zinc-400")} />
                          {f.name}
                          {has && <span className="text-xs text-muted">{fromPlan ? "in plan" : "bought on its own"}</span>}
                        </li>
                      );
                    })}
                </ul>
              </div>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-5">
          <Card title="Usage">
            <div className="flex flex-col gap-3.5">
              <UsageBar label="Locations" used={b.locations} limit={limits.locations} />
              <UsageBar label="Users" used={b.users} limit={limits.users} />
              <UsageBar label="Products" used={b.products} limit={limits.products} />
              <UsageBar label="Invoices this month" used={b.invoicesThisMonth} limit={limits.invoices} />
            </div>
          </Card>
          <Card title="Owner and location">
            <dl className="flex flex-col gap-2.5 text-[13px]">
              <Item label="Owner">{b.ownerName}</Item>
              <Item label="Email">
                <a href={`mailto:${b.ownerEmail}`} className="text-brand-500 hover:underline">
                  {b.ownerEmail}
                </a>
              </Item>
              <Item label="Mobile">{b.ownerMobile || "-"}</Item>
              <Item label="Username">
                <span className="font-mono">{b.username}</span>
              </Item>
              <Item label="First location">{b.locationName}</Item>
              {b.address && <Item label="Address">{b.address}</Item>}
              <Item label="Currency · time zone">
                {b.currency} · {b.timezone}
              </Item>
              <Item label="Last active">{fmtDate(b.lastActive)}</Item>
            </dl>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card
          title="Invoices"
          className="xl:col-span-2"
          action={
            <Link href={`/platform/billing?business=${b.id}`} className="text-xs font-medium text-brand-500 hover:underline">
              Open in billing
            </Link>
          }
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
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
                        <button type="button" onClick={() => setViewing(i.id)} className="font-mono text-xs font-medium text-brand-500 hover:underline">
                          {i.invoiceNo}
                        </button>
                        <span className="block text-xs text-muted">{fmtDate(i.date)}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs">
                        {fmtDate(i.periodStart)} - {fmtDate(i.periodEnd)}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={i.status === "Paid" ? "green" : late ? "rose" : i.status === "Unpaid" ? "amber" : "neutral"}>{late ? "Overdue" : i.status}</Badge>
                        {i.status === "Paid" && <span className="block text-xs text-muted">{i.method}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums">{USD.format(i.total)}</td>
                      <td className="px-5 py-2.5 text-right">
                        {i.status === "Unpaid" ? (
                          <span className="inline-flex gap-1.5">
                            <button type="button" onClick={() => setPaying(i)} className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700">
                              Record payment
                            </button>
                            <button type="button" onClick={() => remind(i)} className="rounded-md border border-line px-2.5 py-1 text-xs font-medium hover:bg-surface">
                              Remind{i.reminders.length ? ` (${i.reminders.length})` : ""}
                            </button>
                          </span>
                        ) : (
                          <button type="button" onClick={() => setViewing(i.id)} className="rounded-md border border-line px-2.5 py-1 text-xs font-medium hover:bg-surface">
                            {i.status === "Paid" ? "Receipt" : "View"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {own.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted">
                      {status.inTrial ? `No invoices yet: the first one is on ${fmtDate(sub?.periodStart)}.` : "No invoices yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Notes" action={<span className="text-xs text-muted">Platform team only</span>}>
          <textarea aria-label="Notes" rows={6} value={notes ?? b.notes} onChange={(event) => setNotes(event.target.value)} placeholder="Calls, promises, special deals…" className={inputClass} />
          <div className="mt-3 flex items-center justify-end gap-3">
            {notes !== null && notes !== b.notes && <span className="text-xs text-amber-600">Not saved</span>}
            <Button
              type="button"
              variant="brand"
              size="sm"
              disabled={notes === null || notes === b.notes}
              onClick={() => {
                updateBusinesses((prev) => prev.map((x) => (x.id === b.id ? { ...x, notes: (notes ?? "").trim() } : x)));
                setNotes(null);
              }}
            >
              Save notes
            </Button>
          </div>
        </Card>
      </div>

      {viewing !== null && own.find((i) => i.id === viewing) && (
        <InvoiceDialog invoice={own.find((i) => i.id === viewing)!} onClose={() => setViewing(null)} onPay={() => setPaying(own.find((i) => i.id === viewing) ?? null)} onRemind={() => remind(own.find((i) => i.id === viewing)!)} />
      )}
      {paying && <PaymentDialog key={paying.id} invoice={paying} business={b.name} onClose={() => setPaying(null)} />}
      {suspending && <SuspendDialog business={b} onClose={() => setSuspending(false)} />}
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

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
