"use client";

/**
 * The subscription as the shop sees it in the business console:
 *   - SubscriptionNotice: a bar for a trial ending or an overdue invoice
 *   - SubscriptionBlocked: replaces every page when the business is
 *     suspended, expired or has no plan, with a way to pay, renew or start
 *   - FeatureLocked: a page whose feature isn't in the subscription, with
 *     the add-on price and "Add to my subscription"
 *
 * Payments here are a demo of the card checkout: they mark the invoice paid.
 */

import Link from "next/link";
import { useState, type ReactNode } from "react";

import type { useBusinessAccess } from "@/components/platform/business-access";
import {
  USD,
  days,
  daysBetween,
  dayFrom,
  featurePrice,
  fmtDate,
  linesTotal,
  nextInvoiceNo,
  periodEndFor,
  planPrice,
  priceLines,
  subscriptionPrice,
  today,
  updateInvoices,
  updateSubscriptions,
  usePlatformSettings,
  type Invoice,
  type Subscription,
} from "@/components/platform/platform-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

type Access = ReturnType<typeof useBusinessAccess>;

/** Card checkout stand-in: marks the invoice as paid today. */
const payByCard = (invoice: Invoice) =>
  updateInvoices((prev) =>
    prev.map((i) => (i.id === invoice.id ? { ...i, status: "Paid", paidAt: today(), method: "Card", ref: `ch_${Date.now().toString(36).slice(-7)}` } : i)),
  );

export function SubscriptionNotice({ access }: { access: Access }) {
  const s = access.status;
  if (!s || !access.sub) return null;
  if (s.state === "Past due") {
    const oldest = [...s.unpaid].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
    return (
      <Bar tone="amber" icon="alert">
        <span>
          <b>{USD.format(s.unpaidTotal)}</b> is overdue by {days(s.overdueDays)}. Pay it to keep selling; the account is suspended after the grace period.
        </span>
        {oldest && (
          <Button type="button" variant="brand" size="sm" onClick={() => payByCard(oldest)}>
            Pay {USD.format(oldest.total)} now
          </Button>
        )}
      </Bar>
    );
  }
  if (s.state === "Trial") {
    const left = daysBetween(today(), access.sub.trialEndDate);
    const price = subscriptionPrice(access.sub, access.plans, access.features);
    return (
      <Bar tone="blue" icon="calendar">
        <span>
          Free trial: <b>{days(left + 1)}</b> left. On {fmtDate(access.sub.periodStart)} your {access.sub.method.toLowerCase()} is charged {USD.format(price)} {access.sub.cycle === "Monthly" ? "a month" : "a year"}.
        </span>
      </Bar>
    );
  }
  return null;
}

function Bar({ tone, icon, children }: { tone: "amber" | "blue"; icon: IconName; children: ReactNode }) {
  return (
    <div
      role="status"
      className={cn(
        "mb-5 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-[13px]",
        tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200" : "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-900 dark:text-brand-100",
      )}
    >
      <Icon name={icon} className="h-4 w-4 shrink-0" />
      <span className="flex flex-1 flex-wrap items-center justify-between gap-3">{children}</span>
    </div>
  );
}

export function SubscriptionBlocked({ access }: { access: Access }) {
  const settings = usePlatformSettings();
  const s = access.status;
  const b = access.business;
  if (!s || !b) return null;
  const manual = s.state === "Suspended" && b.suspended;
  const title =
    s.state === "No plan" ? "Choose a plan to start selling" : s.state === "Expired" ? "Your subscription has expired" : manual ? "Your account is paused" : "Your account is suspended";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 py-6">
      <div className="rounded-2xl border border-line bg-background p-6 text-center shadow-sm shadow-navy-950/[0.03]">
        <span className={cn("mx-auto flex h-14 w-14 items-center justify-center rounded-2xl", s.state === "No plan" ? "bg-brand-50 text-brand-600" : "bg-rose-50 text-rose-600")}>
          <Icon name={s.state === "No plan" ? "layers" : "lock"} className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mx-auto mt-2 max-w-lg text-[13px] text-muted">
          {s.state === "No plan"
            ? `${b.name} doesn't have a plan yet. Pick one below; it starts with a free trial.`
            : manual
              ? `${s.reason} Contact ${settings.appName} support to switch it back on.`
              : s.state === "Expired"
                ? `${b.name}'s plan wasn't renewed. Your data is safe; renew to keep selling.`
                : `${s.reason} Pay the open invoices to switch ${b.name} back on straight away.`}
        </p>
      </div>

      {s.state === "Suspended" && !manual && s.unpaid.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-line bg-background">
          <p className="border-b border-line px-5 py-3 text-sm font-semibold">Open invoices</p>
          <ul className="divide-y divide-line">
            {s.unpaid.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-[13px]">
                <span className="font-mono text-xs">{i.invoiceNo}</span>
                <span className="text-muted">
                  {fmtDate(i.periodStart)} - {fmtDate(i.periodEnd)} · due {fmtDate(i.dueDate)}
                </span>
                <span className="ml-auto font-semibold tabular-nums">{USD.format(i.total)}</span>
                <Button type="button" variant="brand" size="sm" onClick={() => payByCard(i)}>
                  Pay by card
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {s.state === "Expired" && access.sub && <RenewCard sub={access.sub} access={access} />}
      {s.state === "No plan" && <StartPlan access={access} />}

      <p className="text-center text-[13px] text-muted">
        Questions? Email{" "}
        <a href={`mailto:${settings.supportEmail}`} className="font-medium text-brand-500 hover:underline">
          {settings.supportEmail}
        </a>{" "}
        or call {settings.supportPhone}.
      </p>
    </div>
  );
}

function RenewCard({ sub, access }: { sub: Subscription; access: Access }) {
  const prefix = usePlatformSettings().invoicePrefix || "OP";
  const lines = priceLines(sub, access.plans, access.features);
  function renew() {
    const start = today();
    const end = periodEndFor(start, sub.cycle);
    updateSubscriptions((prev) => prev.map((s) => (s.businessId === sub.businessId ? { ...s, autoRenew: true, cancelledAt: "", method: "Card", trialEndDate: "", periodStart: start, periodEnd: end } : s)));
    updateInvoices((prev) => [
      ...prev,
      {
        id: Math.max(0, ...prev.map((i) => i.id)) + 1,
        invoiceNo: nextInvoiceNo(prev, prefix),
        businessId: sub.businessId,
        kind: "Renewal",
        date: start,
        dueDate: start,
        periodStart: start,
        periodEnd: end,
        lines,
        total: linesTotal(lines),
        status: "Paid",
        paidAt: start,
        method: "Card",
        ref: `ch_${Date.now().toString(36).slice(-7)}`,
        reminders: [],
      },
    ]);
  }
  return (
    <div className="rounded-2xl border border-line bg-background p-5">
      <p className="text-sm font-semibold">Renew the same subscription</p>
      <ul className="mt-3 divide-y divide-line text-[13px]">
        {lines.map((l) => (
          <li key={l.label} className="flex justify-between py-2">
            <span>{l.label}</span>
            <span className="tabular-nums">{USD.format(l.amount)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <span className="text-[13px] text-muted">Runs {fmtDate(today())} - {fmtDate(periodEndFor(today(), sub.cycle))}, renews automatically</span>
        <Button type="button" variant="brand" onClick={renew}>
          Renew for {USD.format(linesTotal(lines))}
        </Button>
      </div>
    </div>
  );
}

function StartPlan({ access }: { access: Access }) {
  const choices = access.plans.filter((p) => p.active && !p.isPrivate).sort((a, b) => a.sortOrder - b.sortOrder);
  function start(planId: number) {
    const plan = choices.find((p) => p.id === planId);
    if (!plan || !access.business) return;
    const first = dayFrom(plan.trialDays);
    const sub: Subscription = {
      businessId: access.business.id,
      planId: plan.id,
      addOns: [],
      extraLocations: 0,
      extraUsers: 0,
      cycle: "Monthly",
      method: "Card",
      startDate: today(),
      trialEndDate: plan.trialDays ? dayFrom(-1, first) : "",
      periodStart: first,
      periodEnd: periodEndFor(first, "Monthly"),
      autoRenew: true,
      customPrice: null,
      cancelledAt: "",
    };
    updateSubscriptions((prev) => [...prev.filter((s) => s.businessId !== sub.businessId), sub]);
  }
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {choices.map((p) => (
        <div key={p.id} className={cn("flex flex-col rounded-2xl border bg-background p-5", p.highlighted ? "border-brand-500" : "border-line")}>
          <p className="flex items-center gap-2 font-semibold">
            {p.name}
            {p.highlighted && <Badge tone="blue">Popular</Badge>}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {USD.format(planPrice(p, "Monthly"))}
            <span className="text-[13px] font-normal text-muted"> / month</span>
          </p>
          <p className="mt-1 flex-1 text-[13px] text-muted">{p.description}</p>
          <Button type="button" variant={p.highlighted ? "brand" : "secondary"} className="mt-4 justify-center" onClick={() => start(p.id)}>
            {p.trialDays ? `Start ${p.trialDays}-day free trial` : "Start now"}
          </Button>
        </div>
      ))}
    </div>
  );
}

export function FeatureLocked({ access, featureKey }: { access: Access; featureKey: string }) {
  const f = access.features.find((x) => x.key === featureKey);
  const [added, setAdded] = useState(false);
  const sub = access.sub;
  if (!f) return null;
  const cycle = sub?.cycle ?? "Monthly";
  const withPlans = access.plans.filter((p) => p.active && !p.isPrivate && p.features.includes(f.key)).map((p) => p.name);
  const nextPrice = sub ? subscriptionPrice({ ...sub, addOns: [...sub.addOns, f.key] }, access.plans, access.features) : 0;

  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900 dark:text-brand-200">
        <Icon name="lock" className="h-7 w-7" />
      </span>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">{f.name} isn&apos;t in your plan</h1>
      <p className="mt-2 text-[13px] text-muted">{f.description}</p>
      <div className="mt-6 rounded-2xl border border-line bg-background p-5 text-left text-[13px]">
        <p className="flex items-baseline justify-between gap-3">
          <span className="font-medium">Add {f.name} on its own</span>
          <span className="text-lg font-semibold tabular-nums">
            {USD.format(featurePrice(f, cycle))}
            <span className="text-[13px] font-normal text-muted"> / {cycle === "Monthly" ? "month" : "year"}</span>
          </span>
        </p>
        {withPlans.length > 0 && <p className="mt-1 text-muted">Also included in the {withPlans.join(", ")} plan{withPlans.length === 1 ? "" : "s"}.</p>}
        {added ? (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <Icon name="check" className="h-4 w-4" />
            Added. Your next invoice is {USD.format(nextPrice)}.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <span className="text-muted">{sub ? `Next invoice becomes ${USD.format(nextPrice)}` : "You need a plan first"}</span>
            <Button
              type="button"
              variant="brand"
              disabled={!sub || !f.active}
              onClick={() => {
                updateSubscriptions((prev) => prev.map((x) => (x.businessId === sub?.businessId ? { ...x, addOns: [...x.addOns, f.key] } : x)));
                setAdded(true);
              }}
            >
              Add to my subscription
            </Button>
          </div>
        )}
      </div>
      <Link href="/dashboard" className="mt-5 inline-block text-[13px] font-medium text-brand-500 hover:underline">
        Back to the dashboard
      </Link>
    </div>
  );
}
